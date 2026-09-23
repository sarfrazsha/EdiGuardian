require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');


const app = express();
const mongoose = require("mongoose");
const fs = require('fs');
const crypto = require('crypto');
const port = 8080;
const path = require("path");

// Ensure upload directories exist
const uploadDirs = ['uploads/images', 'uploads/videos', 'uploads/docs'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const upload = require('./middleware/upload');
const getRelativePath = require('./helper/helper')
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// Content Security Policy to allow 'eval' in development
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';"
    );
    next();
});
const sanitizePath = (p) => {
    if (!p) return '';
    if (typeof p !== 'string') return '';
    if (p.startsWith('http') || p.startsWith('data:')) return p;
    // Remove 'uploads/' and 'images/' prefixes to get just the filename
    const filename = p.replace(/^uploads\//, '').replace(/^images\//, '');
    return `/uploads/images/${filename}`;
};

let adminAlertQueue = [];
const link = 'mongodb://127.0.0.1:27017/FYP';
const Admin = require("./models/admin")
const Parent = require('./models/parent');
const Teacher = require('./models/teacher');
const Student = require("./models/student");
const Announcement = require("./models/announcement");
const Fee = require("./models/fee");
const Attendance = require("./models/attendance");
const Class = require("./models/classes");
const Result = require("./models/result");
const Homework = require("./models/homework");
const HomeworkSubmission = require("./models/homework_submission");
const Schedule = require("./models/schedule");
const Datesheet = require("./models/datesheet");
const TeacherAssignment = require("./models/teacher_assignment");
const Payment = require("./models/payment");
const notifications = require("./services/notifications");
const { verifyConnection: verifyEmailConnection } = require("./services/mailer");
const { runDailyChecks, scheduleDailyChecks } = require("./jobs/dailyChecks");



main()
    .then(() => {
        console.log("connected to DB")
    })
    .catch((err) => {
        console.log(err)
    })
async function main() {
    await mongoose.connect(link);
    await migrateLegacyTeacherAssignments();
    await verifyEmailConnection();
    scheduleDailyChecks();
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = String(timeStr).trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

function parsePeriodInterval(period) {
    let startMin = null;
    let endMin = null;

    if (period.startTime && period.endTime) {
        startMin = parseTimeToMinutes(period.startTime);
        endMin = parseTimeToMinutes(period.endTime);
    } else if (period.time && period.time.includes('-')) {
        const [s, e] = period.time.split('-');
        startMin = parseTimeToMinutes(s);
        endMin = parseTimeToMinutes(e);
    }

    return { startMin, endMin };
}

function doIntervalsOverlap(start1, end1, start2, end2) {
    if (start1 === null || end1 === null || start2 === null || end2 === null) return false;
    return start1 < end2 && start2 < end1;
}

function normalizeSubject(subject) {
    return String(subject || '').trim().toLowerCase();
}

function classLabel(cls) {
    if (!cls) return '';
    return `${cls.className} - ${cls.section}`;
}

function labelsMatch(a, b) {
    const na = String(a || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const nb = String(b || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return na === nb;
}

function teacherQualifiedSubjects(teacher) {
    const list = [teacher?.subject, ...(teacher?.subjects || [])].filter(Boolean).map(s => String(s).trim());
    return [...new Set(list)];
}

function teacherCanTeach(teacher, subject) {
    const key = normalizeSubject(subject);
    if (!key) return false;
    const subjects = teacherQualifiedSubjects(teacher).map(normalizeSubject);
    return subjects.includes(key) || subjects.includes('all subjects');
}

async function findClassByLabel(classNo) {
    const trimmed = String(classNo || '').trim();
    if (!trimmed) return null;
    const classes = await Class.find({}).lean();
    return classes.find(c => labelsMatch(classLabel(c), trimmed) || labelsMatch(c.className, trimmed)) || null;
}

// Adds one period to a class's timetable, running the same conflict checks
// POST /api/schedule uses (in-class overlap, cross-class teacher double-booking).
// Shared by /api/schedule and the quick "assign teacher" flow in Manage Classes,
// so an assignment's period always lands in the timetable the same validated way.
async function addPeriodToClassSchedule({ classNoLabel, day, startTime, endTime, subject, teacherName, teacherEmail }) {
    const { startMin, endMin } = parsePeriodInterval({ startTime, endTime });
    if (startMin === null || endMin === null || startMin >= endMin) {
        return { ok: false, status: 400, message: 'A valid start and end time are required for the period.' };
    }

    const newPeriod = {
        time: `${startTime} - ${endTime}`,
        startTime,
        endTime,
        subject,
        teacher: teacherName || '',
        teacherEmail: (teacherEmail || '').toLowerCase()
    };

    let schedule = await Schedule.findOne({ classNo: classNoLabel });
    const dayEntry = schedule?.days?.find(d => d.day === day);

    // In-class overlap: this class must not already have a period on this day
    // that overlaps the new one.
    if (dayEntry) {
        for (const p of dayEntry.periods || []) {
            const { startMin: s2, endMin: e2 } = parsePeriodInterval(p);
            if (doIntervalsOverlap(startMin, endMin, s2, e2)) {
                return {
                    ok: false, status: 409,
                    message: `Conflict: Class ${classNoLabel} already has a period on ${day} (${p.time}) overlapping ${newPeriod.time}.`
                };
            }
        }
    }

    // Cross-class collision: this teacher must not already be booked elsewhere
    // on this day at an overlapping time.
    if (newPeriod.teacherEmail) {
        const otherSchedules = await Schedule.find({ classNo: { $ne: classNoLabel } }).lean();
        for (const otherSch of otherSchedules) {
            const otherDay = (otherSch.days || []).find(od => od.day === day);
            if (!otherDay) continue;
            for (const op of (otherDay.periods || [])) {
                if ((op.teacherEmail || '').toLowerCase() !== newPeriod.teacherEmail) continue;
                const { startMin: s2, endMin: e2 } = parsePeriodInterval(op);
                if (doIntervalsOverlap(startMin, endMin, s2, e2)) {
                    return {
                        ok: false, status: 409,
                        message: `Scheduling Conflict: ${teacherName || teacherEmail} is already teaching Class ${otherSch.classNo} on ${day} during ${op.time}.`
                    };
                }
            }
        }
    }

    if (!schedule) {
        schedule = new Schedule({ classNo: classNoLabel, days: [] });
    }
    let targetDay = schedule.days.find(d => d.day === day);
    if (!targetDay) {
        schedule.days.push({ day, periods: [] });
        targetDay = schedule.days[schedule.days.length - 1];
    }
    targetDay.periods.push(newPeriod);
    await schedule.save();

    return { ok: true, period: newPeriod };
}

// Removes every period matching this class/subject/teacher from the timetable.
// Used when a teacher assignment is removed, so the timetable doesn't keep
// showing periods for a teacher who is no longer assigned to that subject.
async function removeSchedulePeriodsForAssignment({ classNoLabel, subjectKey, teacherEmail }) {
    const schedule = await Schedule.findOne({ classNo: classNoLabel });
    if (!schedule) return 0;
    const cleanEmail = (teacherEmail || '').toLowerCase();
    let removed = 0;
    schedule.days.forEach(d => {
        const before = d.periods.length;
        d.periods = d.periods.filter(p =>
            !(normalizeSubject(p.subject) === subjectKey && (p.teacherEmail || '').toLowerCase() === cleanEmail)
        );
        removed += before - d.periods.length;
    });
    if (removed > 0) await schedule.save();
    return removed;
}

async function collectTeacherAssignmentPairs(email) {
    const cleanEmail = String(email || '').toLowerCase().trim();
    const teacher = await Teacher.findOne({ teacherEmail: cleanEmail }).lean();
    if (!teacher) return { teacher: null, list: [] };

    const assignmentsSet = new Map();

    const allSchedules = await Schedule.find({}).lean();
    allSchedules.forEach(sch => {
        sch.days?.forEach(day => {
            day.periods?.forEach(p => {
                const matchEmail = p.teacherEmail && p.teacherEmail.toLowerCase() === cleanEmail;
                const matchName = p.teacher && teacher.teacherName && p.teacher.trim().toLowerCase() === teacher.teacherName.trim().toLowerCase();
                if (matchEmail || matchName) {
                    const subject = p.subject || teacher.subject || 'General';
                    assignmentsSet.set(`${sch.classNo}_${normalizeSubject(subject)}`, {
                        classNo: sch.classNo,
                        subject
                    });
                }
            });
        });
    });

    const dbAssignments = await TeacherAssignment.find({ teacherEmail: cleanEmail }).populate('classId', 'className section').lean();
    dbAssignments.forEach(a => {
        if (!a.classId) return;
        const label = classLabel(a.classId);
        const subject = a.subject || teacher.subject || 'General';
        const key = `${label}_${normalizeSubject(subject)}`;
        if (!assignmentsSet.has(key)) {
            assignmentsSet.set(key, { classNo: label, subject });
        }
    });

    const legacyClasses = await Class.find({ teacherEmail: cleanEmail }).lean();
    legacyClasses.forEach(c => {
        const label = classLabel(c);
        const subject = teacher.subject || 'General';
        const key = `${label}_${normalizeSubject(subject)}`;
        if (!assignmentsSet.has(key)) {
            assignmentsSet.set(key, { classNo: label, subject });
        }
    });

    return { teacher, list: Array.from(assignmentsSet.values()) };
}

async function teacherAuthorizedForClassSubject(email, classNo, subject) {
    const { teacher, list } = await collectTeacherAssignmentPairs(email);
    if (!teacher) return { ok: false, message: 'Teacher not found.' };

    const subjectOk = list.some(item => labelsMatch(item.classNo, classNo) && normalizeSubject(item.subject) === normalizeSubject(subject));
    if (!subjectOk) {
        return {
            ok: false,
            teacher,
            message: `You are not assigned to teach ${subject} in ${classNo}.`
        };
    }

    if (!teacherCanTeach(teacher, subject)) {
        return {
            ok: false,
            teacher,
            message: `You are only authorized for ${teacher.subject || 'your assigned subject'}, not ${subject}.`
        };
    }

    return { ok: true, teacher };
}

async function migrateLegacyTeacherAssignments() {
    try {
        // Normalise and de-duplicate existing docs first. Docs written before
        // subjectKey existed do not match the unique index, so backfilling them
        // after the upserts below would collide and abort the whole migration.
        const docs = await TeacherAssignment.find({}).sort({ createdAt: 1 });
        const seen = new Map();
        const needsBackfill = [];
        for (const doc of docs) {
            const subject = doc.subject || 'General';
            const subjectKey = doc.subjectKey || normalizeSubject(subject);
            const key = `${doc.classId}|${doc.academicYear}|${subjectKey}`;
            if (seen.has(key)) {
                await TeacherAssignment.deleteOne({ _id: doc._id });
                continue;
            }
            seen.set(key, doc._id);
            if (!doc.subjectKey) needsBackfill.push({ doc, subject, subjectKey });
        }
        // Backfill only once every duplicate is gone, otherwise writing the key
        // onto an older doc collides with a newer duplicate still in the way.
        for (const { doc, subject, subjectKey } of needsBackfill) {
            doc.subjectKey = subjectKey;
            doc.subject = subject;
            await doc.save();
        }

        const legacyClasses = await Class.find({ teacherEmail: { $exists: true, $nin: ['', null] } }).lean();
        for (const legacyClass of legacyClasses) {
            const teacher = await Teacher.findOne({ teacherEmail: legacyClass.teacherEmail }).select('_id teacherEmail subject');
            if (!teacher) continue;
            const subject = teacher.subject || 'General';
            await TeacherAssignment.updateOne(
                { classId: legacyClass._id, academicYear: '2025-26', subjectKey: normalizeSubject(subject) },
                {
                    $setOnInsert: {
                        teacherId: teacher._id,
                        teacherEmail: teacher.teacherEmail,
                        subject
                    }
                },
                { upsert: true }
            );
        }

        await TeacherAssignment.syncIndexes();
    } catch (err) {
        console.error("Migration error:", err);
    }
}

async function getTeacherAssignedClasses(email) {
    try {
        const { list } = await collectTeacherAssignmentPairs(email);
        return [...new Set(list.map(item => item.classNo))];
    } catch (err) {
        console.error("Error in getTeacherAssignedClasses:", err);
        return [];
    }
}

// Update Profile Picture
app.post("/api/user/profile-picture", upload.single('profilePic'), async (req, res) => {
    try {
        const { email, role } = req.body;
        const profilePic = req.file ? req.file.filename : null;

        if (!email || !role || !profilePic) {
            return res.status(400).json({ message: "Missing required data" });
        }

        console.log("Updating Profile Picture:", { email, role, profilePic });

        let user;
        const roleLower = role.toLowerCase();

        if (roleLower === 'admin') {
            user = await Admin.findOneAndUpdate({ adminEmail: email }, { adminImage: profilePic }, { new: true });
        } else if (roleLower === 'teacher') {
            user = await Teacher.findOneAndUpdate({ teacherEmail: email }, { teacherProfile: profilePic }, { new: true });
        } else if (roleLower === 'student') {
            user = await Student.findOneAndUpdate({ studentEmail: email }, { studentImage: profilePic }, { new: true });
        } else if (roleLower === 'parent') {
            user = await Parent.findOneAndUpdate({ parentEmail: email }, { parentImage: profilePic }, { new: true });
        }

        console.log("Database update result:", user ? "Success" : "User Not Found");

        if (!user) {
            return res.status(404).json({ message: `User not found with email ${email} and role ${roleLower}` });
        }

        res.json({ message: "Profile picture updated successfully", profilePic });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete Profile Picture
app.delete("/api/user/profile-picture", async (req, res) => {
    try {
        const { email, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({ message: "Missing required data" });
        }

        let user;
        const roleLower = role.toLowerCase();

        if (roleLower === 'admin') {
            user = await Admin.findOneAndUpdate({ adminEmail: email }, { adminImage: '' }, { new: true });
        } else if (roleLower === 'teacher') {
            user = await Teacher.findOneAndUpdate({ teacherEmail: email }, { teacherProfile: '' }, { new: true });
        } else if (roleLower === 'student') {
            user = await Student.findOneAndUpdate({ studentEmail: email }, { studentImage: '' }, { new: true });
        } else if (roleLower === 'parent') {
            user = await Parent.findOneAndUpdate({ parentEmail: email }, { parentImage: '' }, { new: true });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "Profile picture deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
app.listen(port, () => {
    console.log(`app is running on`, { port })
})
app.get("/api/test", (req, res) => {
    res.json({ message: "React connected successfully" });
});

app.get("/admin", async (req, res) => {
    const admin = new Admin({
        adminId: uuidv4(),
        adminName: "Muhammad Muntaha",
        adminEmail: "muntaha1212@gmail.com",
        adminPassword: "12345678",
        adminPhone: "03123828383"
    })



    await admin.save()
        .then(() => {
            res.send("Admin Added")

        });



})
app.get("/users", async (req, res) => {
    let countStudent = 0, countParents = 0, countAdmins, countTeachers;
    countParents = await Parent.countDocuments({});
    countStudent = await Student.countDocuments({});
    countTeachers = await Teacher.countDocuments({});
    countAdmins = await Admin.countDocuments({});

    const countClasses = await Class.countDocuments({});



    // Grouped by paidAt (when the money actually came in), not by the fee's
    // `month`/`year` fields (which name the billing period a voucher is FOR -
    // e.g. a "May" voucher paid in June should count toward June's total,
    // not May's). Scoped to the current year for the same reason as before:
    // otherwise September 2025 and September 2026 payments would merge.
    const currentYear = new Date().getFullYear();
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthlyFeeData = await Fee.aggregate([
        {
            $match: {
                status: 'Paid',
                paidAt: { $ne: null },
                $expr: { $eq: [{ $year: '$paidAt' }, currentYear] }
            }
        },
        { $group: { _id: { $month: '$paidAt' }, total: { $sum: '$amount' } } }
    ]);
    const monthlyFeeStats = monthlyFeeData.map(item => ({
        month: MONTH_NAMES[item._id - 1],
        total: item.total
    }));


    const feesPendingCount = await Fee.countDocuments({ status: 'Pending' });
    const feesReviewCount = await Fee.countDocuments({ status: 'Review' });
    const feesPaidCount = await Fee.countDocuments({ status: 'Paid' });

    res.status(200).json({
        totalStudents: countStudent,
        totalParents: countParents,
        totalAdmins: countAdmins,
        totalTeachers: countTeachers,
        totalClasses: countClasses,
        monthlyFeeStats: monthlyFeeStats,
        feesPendingCount: feesPendingCount,
        feesReviewCount: feesReviewCount,
        feesPaidCount: feesPaidCount
    })
})

app.get("/api/teacher/stats/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const assignedClasses = await getTeacherAssignedClasses(email);
        if (assignedClasses.length === 0) {
            return res.json({ students: 0, attendanceToday: 0, className: 'Not Assigned' });
        }

        const studentsCount = await Student.countDocuments({ classNo: { $in: assignedClasses } });

        // Get start and end of today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const attendanceRecords = await Attendance.find({
            classNo: { $in: assignedClasses },
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        let attendancePercentage = 0;
        if (attendanceRecords.length > 0 && studentsCount > 0) {
            const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
            // Only count percentage based on marked records to avoid 0% if partial, or based on studentsCount.
            // Usually attendance is marked for all students at once.
            attendancePercentage = Math.round((presentCount / studentsCount) * 100);
        }

        res.json({
            students: studentsCount,
            attendanceToday: attendancePercentage,
            className: assignedClasses[0],
            classes: assignedClasses
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching teacher stats" });
    }
});

app.get("/api/students/teacher/:email", async (req, res) => {
    try {
        const assignedClasses = await getTeacherAssignedClasses(req.params.email);
        const students = await Student.find({ classNo: { $in: assignedClasses } }).lean();
        res.json(students.map(student => ({
            ...student,
            id: student._id,
            studentProfilePicture: sanitizePath(student.studentImage),
            studentClass: student.classNo
        })));
    } catch (err) {
        console.error('Error fetching teacher students:', err);
        res.status(500).json({ message: 'Error fetching teacher students' });
    }
});

app.get("/api/reports/teacher/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const assignedClasses = await getTeacherAssignedClasses(email);
        if (assignedClasses.length === 0) return res.status(404).json({ message: "No class assigned" });

        const className = assignedClasses.join(', ');
        const students = await Student.find({ classNo: { $in: assignedClasses } });

        const now = new Date();
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const attendanceRecords = await Attendance.find({
            classNo: { $in: assignedClasses },
            date: {
                $gte: firstDayLastMonth,
                $lte: lastDayLastMonth
            }
        });

        const uniqueDates = [...new Set(attendanceRecords.map(att => new Date(att.date).toDateString()))];
        const totalMarkedDays = uniqueDates.length;

        let attendanceStats = students.map(s => {
            const studentRecords = attendanceRecords.filter(att => att.studentId === s._id.toString());
            const presentCount = studentRecords.filter(rec => rec.status === 'Present').length;

            return {
                name: s.studentName,
                rollNo: s.studentRollNo,
                percentage: totalMarkedDays > 0 ? Math.round((presentCount / totalMarkedDays) * 100) : 0
            };
        });

        res.json({
            className,
            month: firstDayLastMonth.toLocaleString('default', { month: 'long' }),
            stats: attendanceStats
        });
    } catch (err) {
        res.status(500).json({ message: "Error generating report" });
    }
});


app.get("/api/classes", async (req, res) => {
    try {
        const classes = await Class.find({}).lean();
        const assignments = await TeacherAssignment.find({ classId: { $in: classes.map(c => c._id) } }).lean();
        const teacherEmails = [...new Set([
            ...classes.map(c => c.teacherEmail),
            ...assignments.map(a => a.teacherEmail)
        ].filter(Boolean))];
        const teachers = await Teacher.find({ teacherEmail: { $in: teacherEmails } }).lean();
        const teacherByEmail = teachers.reduce((map, t) => {
            map[t.teacherEmail] = t.teacherName;
            return map;
        }, {});
        const schedules = await Schedule.find({ classNo: { $in: classes.map(c => classLabel(c)) } }).lean();
        const scheduleByClassNo = schedules.reduce((map, s) => {
            map[s.classNo] = s;
            return map;
        }, {});

        res.status(200).json(classes.map(c => {
            const classNoLabel = classLabel(c);
            const sched = scheduleByClassNo[classNoLabel];
            const classAssignments = assignments
                .filter(a => String(a.classId) === String(c._id))
                .map(a => {
                    const periods = [];
                    if (sched) {
                        (sched.days || []).forEach(d => {
                            (d.periods || []).forEach(p => {
                                if (normalizeSubject(p.subject) === a.subjectKey &&
                                    (p.teacherEmail || '').toLowerCase() === (a.teacherEmail || '').toLowerCase()) {
                                    periods.push({ day: d.day, time: p.time });
                                }
                            });
                        });
                    }
                    return {
                        id: a._id,
                        teacherEmail: a.teacherEmail,
                        teacherName: teacherByEmail[a.teacherEmail] || a.teacherEmail,
                        subject: a.subject,
                        periods
                    };
                });
            const teacherSummary = classAssignments.length
                ? classAssignments.map(a => `${a.teacherName} (${a.subject})`).join(', ')
                : (teacherByEmail[c.teacherEmail] || c.teacherId || 'Unassigned');
            return {
                id: c._id,
                _id: c._id,
                name: c.className,
                section: c.section,
                teacher: teacherSummary,
                teacherEmail: c.teacherEmail,
                teacherEmails: classAssignments.map(a => a.teacherEmail),
                assignments: classAssignments
            };
        }));
    } catch (err) {
        res.status(500).json({ message: "Error fetching classes" });
    }
});

app.post("/api/classes", async (req, res) => {
    try {
        const { name, section, teacher, teacherEmail } = req.body;
        const newClass = new Class({
            className: name,
            section,
            teacherId: teacher,
            teacherEmail
        });
        await newClass.save();
        res.status(201).json(newClass);
    } catch (err) {
        console.error("Class Save Error:", err);
        res.status(500).json({ message: "Error creating class" });
    }
});

app.put("/api/classes/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, section, teacher, teacherEmail } = req.body;
        const updatedClass = await Class.findByIdAndUpdate(id, {
            className: name,
            section,
            teacherId: teacher,
            teacherEmail
        }, { new: true });
        res.json(updatedClass);
    } catch (err) {
        res.status(500).json({ message: "Error updating class" });
    }
});

app.delete("/api/classes/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await Class.findByIdAndDelete(id);
        await TeacherAssignment.deleteMany({ classId: id });
        res.json({ message: "Class deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting class" });
    }
});

app.get("/api/teachers/unassigned", async (req, res) => {
    try {
        const teachers = await Teacher.find({}).lean();
        const assignments = await TeacherAssignment.find({}).lean();
        const classes = await Class.find({}).lean();
        const assignedEmails = [...assignments.map(a => a.teacherEmail), ...classes.map(c => c.teacherEmail)];
        const unassigned = teachers.filter(t => !assignedEmails.includes(t.teacherEmail));
        res.json(unassigned);
    } catch (err) {
        res.status(500).json({ message: "Error fetching unassigned teachers" });
    }
});

app.get("/api/teacher-assignments", async (req, res) => {
    try {
        const filter = {};
        if (req.query.teacherEmail) filter.teacherEmail = req.query.teacherEmail.toLowerCase();
        if (req.query.classId) filter.classId = req.query.classId;
        const assignments = await TeacherAssignment.find(filter)
            .populate('classId', 'className section')
            .populate('teacherId', 'teacherName teacherEmail subject')
            .lean();
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching teacher assignments' });
    }
});

const SCHEDULE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

app.post("/api/teacher-assignments", async (req, res) => {
    try {
        const { teacherEmail, classId, academicYear = '2025-26', day, startTime, endTime } = req.body;
        const teacher = await Teacher.findOne({ teacherEmail: String(teacherEmail || '').toLowerCase() });
        const classRecord = await Class.findById(classId);
        if (!teacher || !classRecord) return res.status(404).json({ message: 'Teacher or class not found.' });

        const subject = String(req.body.subject || teacher.subject || '').trim();
        if (!subject) return res.status(400).json({ message: 'Subject is required for teacher assignment.' });
        if (!teacherCanTeach(teacher, subject)) {
            return res.status(403).json({
                message: `${teacher.teacherName} teaches ${teacher.subject || 'a different subject'} and cannot be assigned to ${subject}.`
            });
        }

        if (!SCHEDULE_DAYS.includes(day) || !startTime || !endTime) {
            return res.status(400).json({ message: 'A day and start/end time are required so this assignment can be added to the timetable.' });
        }

        const subjectKey = normalizeSubject(subject);
        const existingSubject = await TeacherAssignment.findOne({ classId, academicYear, subjectKey }).populate('teacherId', 'teacherName');
        if (existingSubject) {
            const holder = existingSubject.teacherId?.teacherName || existingSubject.teacherEmail;
            if (String(existingSubject.teacherId?._id || existingSubject.teacherId) === String(teacher._id)) {
                return res.status(409).json({ message: `${teacher.teacherName} is already assigned to ${subject} in this class.` });
            }
            return res.status(409).json({
                message: `${subject} is already assigned to ${holder} in this class. Another ${subject} teacher cannot be assigned.`
            });
        }

        // Validate + reserve the period BEFORE creating the assignment, so a
        // scheduling conflict leaves no orphaned assignment-without-a-period.
        const classNoLabel = classLabel(classRecord);
        const periodResult = await addPeriodToClassSchedule({
            classNoLabel,
            day,
            startTime,
            endTime,
            subject,
            teacherName: teacher.teacherName,
            teacherEmail: teacher.teacherEmail
        });
        if (!periodResult.ok) {
            return res.status(periodResult.status).json({ message: periodResult.message });
        }

        const assignment = await TeacherAssignment.create({
            teacherId: teacher._id,
            teacherEmail: teacher.teacherEmail,
            classId,
            subject,
            subjectKey,
            academicYear
        });

        if (!classRecord.teacherEmail) {
            classRecord.teacherEmail = teacher.teacherEmail;
            classRecord.teacherId = teacher.teacherName;
            await classRecord.save();
        }

        res.status(201).json({ ...assignment.toObject(), period: periodResult.period });
    } catch (err) {
        const duplicate = err.code === 11000;
        res.status(duplicate ? 409 : 500).json({
            message: duplicate
                ? 'This subject is already assigned to a teacher in this class.'
                : 'Error creating teacher assignment.'
        });
    }
});

app.delete("/api/teacher-assignments/:id", async (req, res) => {
    try {
        const deleted = await TeacherAssignment.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Assignment not found.' });

        // The create route backfills class.teacherEmail; undo that here so the class
        // does not keep pointing at a teacher who no longer has an assignment in it.
        const classRecord = await Class.findById(deleted.classId);
        if (classRecord && classRecord.teacherEmail === deleted.teacherEmail) {
            const remaining = await TeacherAssignment.find({ classId: deleted.classId }).lean();
            const stillTeaching = remaining.some(a => a.teacherEmail === deleted.teacherEmail);
            if (!stillTeaching) {
                const fallback = remaining[0];
                if (fallback) {
                    const fallbackTeacher = await Teacher.findOne({ teacherEmail: fallback.teacherEmail }).lean();
                    classRecord.teacherEmail = fallback.teacherEmail;
                    classRecord.teacherId = fallbackTeacher?.teacherName || '';
                } else {
                    classRecord.teacherEmail = '';
                    classRecord.teacherId = '';
                }
                await classRecord.save();
            }
        }

        // Also drop any timetable periods this assignment put there, so the
        // Timetable page doesn't keep showing a teacher no longer assigned.
        if (classRecord) {
            await removeSchedulePeriodsForAssignment({
                classNoLabel: classLabel(classRecord),
                subjectKey: deleted.subjectKey,
                teacherEmail: deleted.teacherEmail
            });
        }

        res.json({ message: 'Teacher assignment removed.' });
    } catch (err) {
        res.status(500).json({ message: 'Error removing teacher assignment.' });
    }
});


app.post("/students", (req, res, next) => {
    upload.fields([
        { name: 'studentProfilePicture', maxCount: 1 },
        { name: 'parentProfilePicture', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            console.error("Multer Error:", err);
            return res.status(400).json({ message: "File upload error: " + err.message });
        }
        next();
    });
}, async (req, res) => {
    try {

        let { studentName, studentAge, studentRollNo, studentGender, studentEmail, studentPassword, studentClass, parentName, parentPhone, parentAddress, parentEmail, parentPassword } = req.body;

        // Validate password length
        if (!studentPassword || studentPassword.length < 8) {
            return res.status(400).json({ message: "Student password must be at least 8 characters." });
        }
        if (!parentPassword || parentPassword.length < 8) {
            return res.status(400).json({ message: "Parent password must be at least 8 characters." });
        }

        // Check duplicate roll number
        const existingRoll = await Student.findOne({ studentRollNo });
        if (existingRoll) {
            return res.status(400).json({ message: "Roll number already exists. Each student must have a unique roll number." });
        }

        // Check duplicate emails
        const existingStudentEmail = await Student.findOne({ studentEmail });
        if (existingStudentEmail) {
            return res.status(400).json({ message: "Student email already exists." });
        }

        const studentProfilePicture = getRelativePath(req.files, 'studentProfilePicture');
        const parentProfilePicture = getRelativePath(req.files, 'parentProfilePicture');

        console.log("Student Image Path:", studentProfilePicture || "NONE");
        console.log("Parent Image Path:", parentProfilePicture || "NONE");

        const student = new Student({
            classNo: studentClass || '',
            studentName: studentName,
            studentAge: studentAge,
            studentRollNo: studentRollNo,
            studentGender: studentGender,
            studentEmail: studentEmail,
            studentPassword: studentPassword,
            studentImage: studentProfilePicture
        });
        let savedStudent = await student.save();

        // Check if parent with same email already exists
        let existingParent = await Parent.findOne({ parentEmail: parentEmail });
        let savedParent;

        if (existingParent) {
            // Add student to existing parent's studentIds array
            if (!existingParent.studentIds.includes(savedStudent._id)) {
                existingParent.studentIds.push(savedStudent._id);
            }
            // Add to classNos if not already there
            if (!existingParent.classNos.includes(studentClass)) {
                existingParent.classNos.push(studentClass || '');
            }
            savedParent = await existingParent.save();
        } else {
            // Create new parent with studentIds array
            const parent = new Parent({
                studentIds: [savedStudent._id],
                classNos: [studentClass || ''],
                parentName: parentName,
                parentPhone: parentPhone,
                parentAddress: parentAddress,
                parentEmail: parentEmail,
                parentPassword: parentPassword,
                parentImage: parentProfilePicture
            });
            savedParent = await parent.save();
        }

        res.status(201).json({
            message: "Student and Parent data saved successfully!",
            student: savedStudent,
            parent: savedParent
        });
    } catch (err) {
        console.error("Critical Registration Error:", err);
        res.status(500).json({ message: err.message || "Registration failed." });
    }
})
app.get("/api/students-detailed", async (req, res) => {
    try {
        const students = await Student.find({}).lean();
        const parents = await Parent.find({}).lean();

        const detailedStudents = students.map(s => {
            const parent = parents.find(p => 
                p.studentIds && p.studentIds.some(id => id.toString() === s._id.toString())
            );

            return {
                id: s._id,
                studentName: s.studentName,
                studentAge: s.studentAge,
                studentRollNo: s.studentRollNo,
                studentGender: s.studentGender,
                studentClass: s.classNo,
                studentEmail: s.studentEmail,
                studentPassword: s.studentPassword,
                studentProfilePicture: sanitizePath(s.studentImage),
                studentImage: s.studentImage || '',
                parentName: parent ? parent.parentName : '',
                parentPhone: parent ? parent.parentPhone : '',
                parentEmail: parent ? parent.parentEmail : '',
                parentPassword: parent ? parent.parentPassword : '',
                parentAddress: parent ? parent.parentAddress : '',
                parentProfilePicture: sanitizePath(parent ? parent.parentImage : ''),
                parentImage: parent ? parent.parentImage : ''
            };
        });

        res.json(detailedStudents);
    } catch (err) {
        console.error("Error fetching detailed students:", err);
        res.status(500).json({ message: "Error fetching detailed student info" });
    }
});

// 
// 
app.post("/student/login", async (req, res) => {
    try {
        let { email, password, role } = req.body;
        role = (role || '').trim().toLowerCase();

        let user = null;
        let dbPassword = null;
        let uname = "";
        let profilePic = "";



        if (role === "student") {
            user = await Student.findOne({ studentEmail: email });
            if (user) {
                dbPassword = user.studentPassword;
                uname = user.studentName;
                profilePic = sanitizePath(user.studentImage);
            }

        } else if (role === "parent") {
            user = await Parent.findOne({ parentEmail: email });
            if (user) {
                dbPassword = user.parentPassword;
                uname = user.parentName;
                profilePic = sanitizePath(user.parentImage);
            }
        } else if (role === "teacher") {
            user = await Teacher.findOne({ teacherEmail: email });
            if (user) {
                dbPassword = user.teacherPassword;
                uname = user.teacherName;
                profilePic = sanitizePath(user.teacherProfile);
            }
        } else {
            user = await Admin.findOne({ adminEmail: email });
            if (user) {
                dbPassword = user.adminPassword;
                uname = user.adminName;
                profilePic = sanitizePath(user.adminImage);
            }
        }

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (dbPassword === password) {
            const responseData = {
                message: "Logged in Successfully!",
                email: email,
                role: role,
                uname: uname,
                profilePic: profilePic
            };


            if (role === "teacher") {
                const teacherClasses = await getTeacherAssignedClasses(email);
                responseData.teacherClass = teacherClasses[0] || 'Not Assigned';
                responseData.teacherClasses = teacherClasses;
                responseData.teacherSubject = user.subject || 'General';
                responseData.teacherSubjects = (user.subjects && user.subjects.length > 0) ? user.subjects : [user.subject || 'General'];
            } else if (role === "parent") {
                // Get all children for this parent
                const children = await Student.find({ _id: { $in: user.studentIds } }).lean();
                responseData.children = children.map(child => ({
                    id: child._id,
                    name: child.studentName,
                    rollNo: child.studentRollNo,
                    classNo: child.classNo,
                    age: child.studentAge,
                    gender: child.studentGender,
                    email: child.studentEmail,
                    image: sanitizePath(child.studentImage)
                }));
                // Set first child as default selected
                if (children.length > 0) {
                    responseData.selectedChildId = children[0]._id;
                    responseData.classNo = children[0].classNo;
                }
            } else if (role === "student") {
                responseData.studentId = user._id;
                responseData.classNo = user.classNo;
            }

            return res.status(201).json(responseData);
        } else {
            return res.status(400).json({ message: "Wrong Password" });
        }

    } catch (err) {
        console.error("ERROR:", err);
        return res.status(500).json({ message: "Server error during login" });
    }
});


app.put("/api/students/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            studentName, studentEmail, studentPassword, studentAge, studentGender,
            parentName, parentPhone, parentEmail, parentPassword, parentAddress
        } = req.body;

        const cleanStudentName = String(studentName || '').trim();
        const cleanStudentEmail = String(studentEmail || '').trim();
        const cleanParentName = String(parentName || '').trim();
        const cleanParentPhone = String(parentPhone || '').trim();
        const cleanParentEmail = String(parentEmail || '').trim();
        const cleanParentAddress = String(parentAddress || '').trim();
        const cleanStudentAge = Number(studentAge);

        if (!cleanStudentName || !cleanStudentEmail || !cleanParentName || !cleanParentPhone || !cleanParentEmail || !cleanParentAddress || !studentGender || Number.isNaN(cleanStudentAge)) {
            return res.status(400).json({ message: "All student and parent fields are required." });
        }

        if (!cleanStudentEmail.endsWith('@gmail.com')) {
            return res.status(400).json({ message: "Student email must end with @gmail.com." });
        }

        if (!cleanParentEmail.endsWith('@gmail.com')) {
            return res.status(400).json({ message: "Parent email must end with @gmail.com." });
        }

        if (!/^\d{11}$/.test(cleanParentPhone)) {
            return res.status(400).json({ message: "Parent phone number must be exactly 11 digits." });
        }

        if (studentPassword && studentPassword.length < 8) {
            return res.status(400).json({ message: "Student password must be at least 8 characters." });
        }
        if (parentPassword && parentPassword.length < 8) {
            return res.status(400).json({ message: "Parent password must be at least 8 characters." });
        }

        const existingStudent = await Student.findById(id);
        if (!existingStudent) return res.status(404).json({ message: "Student not found" });

        const studentUpdateData = {
            studentName: cleanStudentName,
            studentEmail: cleanStudentEmail,
            studentAge: cleanStudentAge,
            studentGender
        };
        if (studentPassword) studentUpdateData.studentPassword = studentPassword;

        await Student.findByIdAndUpdate(id, studentUpdateData);

        const parentUpdateData = {
            parentName: cleanParentName,
            parentPhone: cleanParentPhone,
            parentEmail: cleanParentEmail,
            parentAddress: cleanParentAddress
        };
        if (parentPassword) parentUpdateData.parentPassword = parentPassword;

        const matchingParent = await Parent.findOne({ studentIds: id });
        if (!matchingParent) {
            return res.status(404).json({ message: "Parent record not found for this student." });
        }

        await Parent.findByIdAndUpdate(matchingParent._id, parentUpdateData);

        res.json({ message: "Student and Parent updated successfully!" });
    } catch (err) {
        console.error("Error updating student/parent:", err);
        res.status(500).json({ message: "Failed to update records" });
    }
});

app.delete("/api/students/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedStudent = await Student.findByIdAndDelete(id);

        if (!deletedStudent) {
            return res.status(404).json({ message: "Student not found" });
        }

        await Parent.deleteMany({ studentId: id });

        res.json({ message: "Student and linked parent deleted successfully" });
    } catch (err) {
        console.error("Error deleting student and parent:", err);
        res.status(500).json({ message: "Error deleting student and linked parent" });
    }
});

app.post("/users", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), async (req, res) => {
    try {
        let { teacherName, phoneNumber, email, password, address, subject, subjects } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Teacher password must be at least 8 characters." });
        }

        const cleanSubject = String(subject || '').trim() || 'General';
        let parsedSubjects = [];
        if (Array.isArray(subjects)) {
            parsedSubjects = subjects;
        } else if (typeof subjects === 'string' && subjects.trim()) {
            try {
                parsedSubjects = JSON.parse(subjects);
            } catch {
                parsedSubjects = subjects.split(',').map(s => s.trim()).filter(Boolean);
            }
        }
        if (parsedSubjects.length === 0) parsedSubjects = [cleanSubject];

        const profilePicture = getRelativePath(req.files, 'profilePicture');

        const teacher = new Teacher({
            teacherName: teacherName,
            teacherContact: phoneNumber,
            teacherEmail: email,
            teacherAddress: address,
            teacherPassword: password,
            teacherProfile: profilePicture,
            subject: cleanSubject,
            subjects: parsedSubjects
        });

        await teacher.save();
        res.status(201).json({
            message: "Teacher data saved successfully!",
            teacher
        });
    } catch (err) {
        console.error("Teacher Save Error:", err);
        res.status(500).json({ message: err.message || "Error saving teacher record" });
    }
});

app.get("/api/teachers", async (req, res) => {
    try {
        const teachers = await Teacher.find({}).lean();
        const classes = await Class.find({}).lean();

        const teachersWithPics = teachers.map(t => {
            const assignedClass = classes.find(c => c.teacherEmail === t.teacherEmail);
            return {
                ...t,
                id: t._id,
                class: assignedClass ? `${assignedClass.className} - ${assignedClass.section}` : 'Not Assigned',
                phoneNumber: t.teacherContact,
                email: t.teacherEmail,
                subject: t.subject || 'General',
                subjects: t.subjects && t.subjects.length > 0 ? t.subjects : [t.subject || 'General'],
                profilePicture: t.teacherProfile ? `/uploads/${t.teacherProfile}` : ''
            };
        });
        res.json(teachersWithPics);
    } catch (err) {
        res.status(500).json({ message: "Error fetching teachers" });
    }
});

app.post("/api/teachers/reset-all", async (req, res) => {
    try {
        await Teacher.deleteMany({});
        await TeacherAssignment.deleteMany({});
        await Class.updateMany({}, { $set: { teacherId: '', teacherEmail: '' } });
        // Clear teacher and teacherEmail in all timetable periods
        const schedules = await Schedule.find({});
        for (const sch of schedules) {
            if (sch.days) {
                sch.days.forEach(d => {
                    if (d.periods) {
                        d.periods.forEach(p => {
                            p.teacher = '';
                            p.teacherEmail = '';
                        });
                    }
                });
                await sch.save();
            }
        }
        res.json({ message: "All previous teachers, assignments, and schedule bookings have been successfully reset." });
    } catch (err) {
        console.error("Teacher Reset Error:", err);
        res.status(500).json({ message: "Error resetting teachers" });
    }
});

app.get("/api/teacher/assignments/:email", async (req, res) => {
    try {
        const { teacher, list } = await collectTeacherAssignmentPairs(req.params.email);
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });

        res.json({
            teacherName: teacher.teacherName,
            teacherEmail: teacher.teacherEmail,
            primarySubject: teacher.subject || 'General',
            subjects: teacherQualifiedSubjects(teacher),
            assignments: list,
            classes: [...new Set(list.map(a => a.classNo))]
        });
    } catch (err) {
        console.error("Error fetching teacher assignments:", err);
        res.status(500).json({ message: "Error fetching teacher assignments" });
    }
});

// A teacher's own weekly timetable, aggregated across every class they teach -
// not one class's full schedule, but just this teacher's periods, wherever
// they fall. Read-only: teachers view this, they don't edit it here.
app.get("/api/teacher/timetable/:email", async (req, res) => {
    try {
        const cleanEmail = String(req.params.email || '').toLowerCase().trim();
        const teacher = await Teacher.findOne({ teacherEmail: cleanEmail }).lean();
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });

        const schedules = await Schedule.find({}).lean();
        const days = SCHEDULE_DAYS.map(day => ({ day, periods: [] }));
        const dayIndex = SCHEDULE_DAYS.reduce((map, d, i) => { map[d] = i; return map; }, {});

        schedules.forEach(sch => {
            (sch.days || []).forEach(d => {
                if (!(d.day in dayIndex)) return;
                (d.periods || []).forEach(p => {
                    if ((p.teacherEmail || '').toLowerCase() === cleanEmail) {
                        days[dayIndex[d.day]].periods.push({
                            time: p.time,
                            startTime: p.startTime,
                            endTime: p.endTime,
                            subject: p.subject,
                            classNo: sch.classNo
                        });
                    }
                });
            });
        });

        days.forEach(d => d.periods.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')));

        res.json({
            teacherName: teacher.teacherName,
            teacherEmail: teacher.teacherEmail,
            days
        });
    } catch (err) {
        console.error("Error fetching teacher timetable:", err);
        res.status(500).json({ message: "Error fetching teacher timetable" });
    }
});

app.put("/api/teacher/update/:id", upload.fields([{ name: 'profilePicture', maxCount: 1 }]), async (req, res) => {
    try {
        const { id } = req.params;
        let { teacherName, phoneNumber, email, address, password, subject, subjects } = req.body;

        if (password && password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        const existingTeacher = await Teacher.findById(id);
        if (!existingTeacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const cleanSubject = (subject !== undefined ? String(subject).trim() : existingTeacher.subject) || 'General';
        let parsedSubjects = existingTeacher.subjects || [cleanSubject];
        if (subjects !== undefined) {
            if (Array.isArray(subjects)) {
                parsedSubjects = subjects;
            } else if (typeof subjects === 'string' && subjects.trim()) {
                try {
                    parsedSubjects = JSON.parse(subjects);
                } catch {
                    parsedSubjects = subjects.split(',').map(s => s.trim()).filter(Boolean);
                }
            }
        }
        if (!parsedSubjects.includes(cleanSubject)) parsedSubjects.unshift(cleanSubject);

        const updatedData = {
            teacherName,
            teacherContact: phoneNumber,
            teacherEmail: email,
            teacherAddress: address,
            subject: cleanSubject,
            subjects: parsedSubjects
        };

        if (password) {
            updatedData.teacherPassword = password;
        }

        const profilePicture = getRelativePath(req.files, 'profilePicture');
        if (profilePicture) {
            updatedData.teacherProfile = profilePicture;
        }

        const teacher = await Teacher.findByIdAndUpdate(id, updatedData, { new: true });
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        if (existingTeacher.teacherEmail !== email || existingTeacher.teacherName !== teacherName) {
            await Class.updateMany(
                {
                    $or: [
                        { teacherEmail: existingTeacher.teacherEmail },
                        { teacherId: existingTeacher.teacherName }
                    ]
                },
                {
                    teacherEmail: email,
                    teacherId: teacherName
                }
            );
        }

        res.json({ message: "Teacher updated successfully", teacher });
    } catch (err) {
        console.error("Teacher Update Error:", err);
        res.status(500).json({ message: "Error updating teacher record" });
    }
});


app.delete("/api/teacher/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const teacher = await Teacher.findById(id);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        const teacherEmail = teacher.teacherEmail;

        // A deleted teacher can't leave behind assignments or timetable
        // periods that still point at them - clean those up as part of the
        // same operation rather than leaving dangling references.
        const assignments = await TeacherAssignment.find({ teacherEmail }).lean();
        const affectedClassIds = [...new Set(assignments.map(a => String(a.classId)))];
        await TeacherAssignment.deleteMany({ teacherEmail });

        const schedules = await Schedule.find({});
        for (const sch of schedules) {
            let removed = 0;
            sch.days.forEach(d => {
                const before = d.periods.length;
                d.periods = d.periods.filter(p => (p.teacherEmail || '').toLowerCase() !== teacherEmail.toLowerCase());
                removed += before - d.periods.length;
            });
            if (removed > 0) await sch.save();
        }

        for (const classId of affectedClassIds) {
            const classRecord = await Class.findById(classId);
            if (classRecord && classRecord.teacherEmail === teacherEmail) {
                const remaining = await TeacherAssignment.find({ classId }).lean();
                const fallback = remaining[0];
                if (fallback) {
                    const fallbackTeacher = await Teacher.findOne({ teacherEmail: fallback.teacherEmail }).lean();
                    classRecord.teacherEmail = fallback.teacherEmail;
                    classRecord.teacherId = fallbackTeacher?.teacherName || '';
                } else {
                    classRecord.teacherEmail = '';
                    classRecord.teacherId = '';
                }
                await classRecord.save();
            }
        }

        await Teacher.findByIdAndDelete(id);
        res.json({ message: "Teacher and their class assignments removed successfully" });
    } catch (err) {
        console.error("Error deleting teacher:", err);
        res.status(500).json({ message: "Error deleting teacher" });
    }
});




app.get("/api/announcements", async (req, res) => {
    try {
        const { role } = req.query;
        const now = new Date();
        let filter = {

            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
        };
        if (role && role.toLowerCase() !== 'admin') {

            filter.targetAudience = { $in: ['all', role.toLowerCase()] };
        }
        const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: "Error fetching announcements" });
    }
});


app.post("/api/announcements", async (req, res) => {
    try {
        const { title, content, role, targetAudience, durationDays } = req.body;
        if (role !== "admin" && role !== "Admin") {
            return res.status(403).json({ message: "Unauthorized: Admins only" });
        }

        let expiresAt = null;
        if (durationDays && Number(durationDays) > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
        }

        const newAnnouncement = new Announcement({
            title,
            content,
            targetAudience: targetAudience || 'all',
            expiresAt
        });
        await newAnnouncement.save();
        res.status(201).json(newAnnouncement);
    } catch (err) {
        res.status(500).json({ message: "Error creating announcement" });
    }
});

app.put("/api/announcements/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, role, targetAudience, durationDays } = req.body;

        if (role !== "admin" && role !== "Admin") {
            return res.status(403).json({ message: "Unauthorized: Admins only" });
        }

        let expiresAt = null;
        if (durationDays && Number(durationDays) > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
        }

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            id,
            { title, content, targetAudience: targetAudience || 'all', expiresAt },
            { new: true }
        );
        res.json(updatedAnnouncement);
    } catch (err) {
        res.status(500).json({ message: "Error updating announcement" });
    }
});

app.put("/api/announcements/mark-all-read", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });

        await Announcement.updateMany(
            { readBy: { $ne: email } },
            { $addToSet: { readBy: email } }
        );
        res.json({ message: "All marked as read" });
    } catch (err) {
        res.status(500).json({ message: "Error marking announcements as read" });
    }
});

app.delete("/api/announcements/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const { role } = req.body;
        const userRole = role || req.query.role;

        if (userRole !== "admin" && userRole !== "Admin") {
            return res.status(403).json({ message: "Unauthorized: Admins only" });
        }

        await Announcement.findByIdAndDelete(id);
        res.json({ message: "Announcement deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting announcement" });
    }
});


app.get("/api/parents", async (req, res) => {
    try {
        const students = await Student.find({}).lean();
        const parents = await Parent.find({}).lean();

        // Driven from students, not parents: the Parent schema links to its
        // children via `studentIds` (an array - a parent can have more than
        // one), so this returns one row per (parent, student) pair. A parent
        // with no matching student, or a student with no linked parent, is
        // skipped rather than produced with placeholder data.
        const rows = [];
        students.forEach(s => {
            const parent = parents.find(p =>
                p.studentIds && p.studentIds.some(id => id.toString() === s._id.toString())
            );
            if (!parent) return;
            rows.push({
                ...parent,
                studentId: s._id,
                studentName: s.studentName,
                studentRollNo: s.studentRollNo,
                studentAge: s.studentAge,
                studentGender: s.studentGender,
                studentImage: sanitizePath(s.studentImage),
                parentImage: sanitizePath(parent.parentImage),
                classNo: s.classNo
            });
        });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Error fetching parents" });
    }
});

// Get parent's children
app.get("/api/parent/children/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const parent = await Parent.findOne({ parentEmail: email });
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }

        const children = await Student.find({ _id: { $in: parent.studentIds } }).lean();
        const childrenData = children.map(child => ({
            id: child._id,
            name: child.studentName,
            rollNo: child.studentRollNo,
            classNo: child.classNo,
            age: child.studentAge,
            gender: child.studentGender,
            email: child.studentEmail,
            image: sanitizePath(child.studentImage)
        }));

        res.json(childrenData);
    } catch (err) {
        res.status(500).json({ message: "Error fetching children" });
    }
});

app.post("/api/fees", upload.single('adminVoucher'), async (req, res) => {
    try {
        const { studentName, parentEmail, amount, dueDate, month, year, classNo, role } = req.body;
        if (role !== "admin" && role !== "Admin") {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (!month || !year) {
            return res.status(400).json({ message: "Fee month and year are required." });
        }

        const existingFee = await Fee.findOne({ parentEmail, month, year });
        if (existingFee) {
            return res.status(400).json({ message: `A fee voucher for ${month} ${year} has already been issued to this parent.` });
        }

        const adminVoucher = req.file ? req.file.path.replace(/\\/g, '/').replace(/^uploads\//, '') : '';
        if (!adminVoucher) {
            return res.status(400).json({ message: "Fee voucher file is required." });
        }

        const newFee = new Fee({
            studentName,
            parentEmail,
            amount,
            dueDate,
            month,
            year,
            adminVoucher,
            classNo,
            status: 'Pending'
        });
        await newFee.save();
        res.status(201).json(newFee);
    } catch (err) {
        console.error("Error creating fee alert:", err);
        res.status(500).json({ message: "Error creating fee alert", error: err });
    }
});

app.post("/api/fees/bulk", upload.single('adminVoucher'), async (req, res) => {
    try {
        let { parents, amount, dueDate, month, year, classNo, role } = req.body;
        if (role !== "admin" && role !== "Admin") {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (!month || !year) {
            return res.status(400).json({ message: "Fee month and year are required." });
        }

        if (typeof parents === 'string') {
            try {
                parents = JSON.parse(parents);
            } catch (e) {
                return res.status(400).json({ message: "Invalid parents data format." });
            }
        }

        if (!parents || !parents.length) {
            return res.status(400).json({ message: "No parents found to issue fees to." });
        }

        const adminVoucher = req.file ? req.file.path.replace(/\\/g, '/').replace(/^uploads\//, '') : '';
        if (!adminVoucher) {
            return res.status(400).json({ message: "Fee voucher file is required." });
        }

        const parentEmails = parents.map(p => p.parentEmail).filter(Boolean);
        const existingFees = await Fee.find({ parentEmail: { $in: parentEmails }, month, year });
        if (existingFees.length > 0) {
            const duplicates = [...new Set(existingFees.map(f => `${f.parentEmail}`))].join(', ');
            return res.status(400).json({ message: `Fee vouchers for ${month} ${year} already exist for: ${duplicates}` });
        }

        const feesToInsert = parents.map(p => ({
            studentName: p.studentName || "Student",
            parentEmail: p.parentEmail,
            amount,
            dueDate,
            month,
            year,
            adminVoucher,
            classNo,
            status: 'Pending'
        }));

        await Fee.insertMany(feesToInsert);
        res.status(201).json({ message: `Successfully issued ${feesToInsert.length} fee alerts.` });
    } catch (err) {
        console.error("Bulk fee error:", err);
        res.status(500).json({ message: "Error creating bulk fee alerts", error: err });
    }
});

app.get("/api/fees", async (req, res) => {
    try {
        const { role, email } = req.query;
        if (role === "admin" || role === "Admin") {
            const fees = await Fee.find().sort({ createdAt: -1 });
            return res.json(fees);
        } else if (role === "parent" || role === "Parent") {
            const fees = await Fee.find({ parentEmail: email }).sort({ createdAt: -1 });
            return res.json(fees);
        }
        return res.status(403).json({ message: "Unauthorized role" });
    } catch (err) {
        res.status(500).json({ message: "Error fetching fees" });
    }
});

app.put("/api/fees/:id/upload-receipt", upload.single('parentReceipt'), async (req, res) => {
    try {
        const { id } = req.params;
        const parentReceipt = req.file ? req.file.path.replace(/\\/g, '/').replace(/^uploads\//, '') : '';

        if (!parentReceipt) {
            return res.status(400).json({ message: "Receipt file is required." });
        }

        const livePayment = await Payment.findOne({ voucherId: id, status: { $in: ['Pending', 'Approved'] } });
        if (livePayment) {
            return res.status(409).json({ message: `An online payment (${livePayment.transactionId}) is already ${livePayment.status.toLowerCase()} for this voucher.` });
        }

        const updatedFee = await Fee.findByIdAndUpdate(
            id,
            { parentReceipt, status: 'Review' },
            { new: true }
        );

        if (updatedFee) {
            adminAlertQueue.push({
                _id: Date.now().toString(),
                title: "Action Required: Fee Receipt Uploaded",
                content: `${updatedFee.studentName} has uploaded a receipt for ${updatedFee.month}. Please review in the Fee Records Hub.`,
                isAlert: true,
                createdAt: new Date()
            });
        }

        res.json(updatedFee);
    } catch (err) {
        console.error("Receipt upload error:", err);
        res.status(500).json({ message: "Error uploading receipt" });
    }
});

app.put("/api/fees/:id/approve", async (req, res) => {
    try {
        const { id } = req.params;
        const updatedFee = await Fee.findByIdAndUpdate(
            id,
            { status: 'Paid', paidAt: new Date() },
            { new: true }
        );
        res.json(updatedFee);
    } catch (err) {
        res.status(500).json({ message: "Error approving fee" });
    }
});

// ---------------------------------------------------------------------------
// Mock online payments (simulation only - no real gateway, no real money).
// Flow: parent submits -> Pending -> admin approves (voucher -> Paid) or
// rejects (voucher stays unpaid). Parents can never mark a voucher Paid.
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = ['Mock Card', 'Mock JazzCash', 'Mock Easypaisa'];

// The app has no session/token auth: every route receives role + email from
// the client. These at least confirm the email belongs to a real account of
// that role before any payment action is allowed.
async function getAdminFromRequest(req) {
    const src = { ...req.query, ...req.body };
    if ((src.role || '').toLowerCase() !== 'admin' || !src.email) return null;
    return Admin.findOne({ adminEmail: src.email });
}

async function getParentFromRequest(req) {
    const src = { ...req.query, ...req.body };
    if ((src.role || '').toLowerCase() !== 'parent' || !src.email) return null;
    return Parent.findOne({ parentEmail: src.email });
}

function voucherNumberFor(fee) {
    return `VCH-${fee._id.toString().slice(-8).toUpperCase()}`;
}

function generateTransactionId() {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `TXN-${date}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Flatten a populated payment into what the UI needs.
function serializePayment(p) {
    const fee = p.voucherId && p.voucherId._id ? p.voucherId : null;
    return {
        _id: p._id,
        transactionId: p.transactionId,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        accountLast4: p.accountLast4,
        status: p.status,
        rejectionReason: p.rejectionReason,
        createdAt: p.createdAt,
        approvedAt: p.approvedAt,
        rejectedAt: p.rejectedAt,
        approvedBy: p.approvedBy && p.approvedBy.adminName ? p.approvedBy.adminName : null,
        rejectedBy: p.rejectedBy && p.rejectedBy.adminName ? p.rejectedBy.adminName : null,
        voucher: fee ? {
            _id: fee._id,
            voucherNumber: voucherNumberFor(fee),
            month: fee.month,
            year: fee.year,
            dueDate: fee.dueDate,
            amount: fee.amount,
            classNo: fee.classNo,
            status: fee.status
        } : null,
        studentName: p.studentId && p.studentId.studentName ? p.studentId.studentName : (fee ? fee.studentName : ''),
        parentName: p.parentId && p.parentId.parentName ? p.parentId.parentName : '',
        parentEmail: p.parentId && p.parentId.parentEmail ? p.parentId.parentEmail : ''
    };
}

function populatePayment(query) {
    return query
        .populate('voucherId')
        .populate('studentId', 'studentName')
        .populate('parentId', 'parentName parentEmail')
        .populate('approvedBy', 'adminName')
        .populate('rejectedBy', 'adminName');
}

// Submit a mock payment (parent)
app.post("/api/payments", async (req, res) => {
    try {
        const parent = await getParentFromRequest(req);
        if (!parent) return res.status(403).json({ message: "Only a logged-in parent can submit payments." });

        const { voucherId, amount, paymentMethod, accountNumber } = req.body;
        if (!voucherId || !mongoose.isValidObjectId(voucherId)) {
            return res.status(400).json({ message: "A valid fee voucher is required." });
        }
        if (!PAYMENT_METHODS.includes(paymentMethod)) {
            return res.status(400).json({ message: "Invalid payment method." });
        }

        // Dummy details only. Card = 16 digits, wallet = 11-digit mobile number.
        // Only the last 4 digits are stored; CVV / PIN are never sent here.
        const digits = String(accountNumber || '').replace(/\D/g, '');
        if (paymentMethod === 'Mock Card' && digits.length !== 16) {
            return res.status(400).json({ message: "Enter a 16-digit dummy card number." });
        }
        if (paymentMethod !== 'Mock Card' && !/^03\d{9}$/.test(digits)) {
            return res.status(400).json({ message: "Enter an 11-digit dummy mobile wallet number (03XXXXXXXXX)." });
        }

        const fee = await Fee.findById(voucherId);
        if (!fee) return res.status(404).json({ message: "Fee voucher not found." });
        if (fee.parentEmail !== parent.parentEmail) {
            return res.status(403).json({ message: "You can only pay vouchers issued to you." });
        }
        if (fee.status === 'Paid') {
            return res.status(409).json({ message: "This voucher is already paid." });
        }
        if (fee.status === 'Review') {
            return res.status(409).json({ message: "A bank receipt for this voucher is already under review." });
        }
        if (Number(amount) !== fee.amount) {
            return res.status(400).json({ message: `Payment amount must equal the voucher amount (Rs ${fee.amount}).` });
        }

        const live = await Payment.findOne({ activeVoucher: fee._id });
        if (live) {
            return res.status(409).json({ message: `A payment (${live.transactionId}) is already ${live.status.toLowerCase()} for this voucher.` });
        }

        const children = await Student.find({ _id: { $in: parent.studentIds } }, 'studentName').lean();
        const student = children.find(c => c.studentName === fee.studentName);

        const payment = new Payment({
            transactionId: generateTransactionId(),
            voucherId: fee._id,
            studentId: student ? student._id : undefined,
            parentId: parent._id,
            amount: fee.amount,
            paymentMethod,
            accountLast4: digits.slice(-4),
            status: 'Pending',
            activeVoucher: fee._id
        });
        await payment.save();

        adminAlertQueue.push({
            _id: Date.now().toString(),
            title: "Action Required: Online Payment Submitted",
            content: `${fee.studentName}'s parent submitted payment ${payment.transactionId} for ${fee.month}. Please review it under Fee Records → Online Payments.`,
            isAlert: true,
            createdAt: new Date()
        });

        const saved = await populatePayment(Payment.findById(payment._id));
        res.status(201).json({
            message: "Payment submitted successfully. Your payment is waiting for admin approval.",
            payment: serializePayment(saved)
        });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({ message: "A payment is already in progress for this voucher." });
        }
        console.error("Submit payment error:", err);
        res.status(500).json({ message: "Error submitting payment" });
    }
});

// Parent's own payment history
app.get("/api/payments/my", async (req, res) => {
    try {
        const parent = await getParentFromRequest(req);
        if (!parent) return res.status(403).json({ message: "Unauthorized" });
        const payments = await populatePayment(Payment.find({ parentId: parent._id }).sort({ createdAt: -1 }));
        res.json(payments.map(serializePayment));
    } catch (err) {
        console.error("Fetch parent payments error:", err);
        res.status(500).json({ message: "Error fetching payments" });
    }
});

// All payment requests (admin) with optional status filter and search by
// student name or transaction ID
app.get("/api/payments", async (req, res) => {
    try {
        const admin = await getAdminFromRequest(req);
        if (!admin) return res.status(403).json({ message: "Only an admin can view payment requests." });

        const { status, search } = req.query;
        const filter = {};
        if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) filter.status = status;

        let payments = (await populatePayment(Payment.find(filter).sort({ createdAt: -1 }))).map(serializePayment);
        if (search && search.trim()) {
            const term = search.trim().toLowerCase();
            payments = payments.filter(p =>
                p.transactionId.toLowerCase().includes(term) ||
                (p.studentName || '').toLowerCase().includes(term)
            );
        }
        res.json(payments);
    } catch (err) {
        console.error("Fetch payments error:", err);
        res.status(500).json({ message: "Error fetching payments" });
    }
});

// Loads a payment the requester may see: any payment for an admin, only
// their own for a parent. Sends the error response itself and returns null.
async function loadAuthorizedPayment(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ message: "Invalid payment id." });
        return null;
    }
    const admin = await getAdminFromRequest(req);
    const parent = admin ? null : await getParentFromRequest(req);
    if (!admin && !parent) {
        res.status(403).json({ message: "Unauthorized" });
        return null;
    }
    const payment = await populatePayment(Payment.findById(req.params.id));
    if (!payment) {
        res.status(404).json({ message: "Payment not found." });
        return null;
    }
    if (parent && payment.parentId._id.toString() !== parent._id.toString()) {
        res.status(403).json({ message: "You can only view your own payments." });
        return null;
    }
    return payment;
}

// Payment details (admin, or the owning parent)
app.get("/api/payments/:id", async (req, res) => {
    try {
        const payment = await loadAuthorizedPayment(req, res);
        if (payment) res.json(serializePayment(payment));
    } catch (err) {
        console.error("Fetch payment error:", err);
        res.status(500).json({ message: "Error fetching payment" });
    }
});

// Receipt - only for Approved payments
app.get("/api/payments/:id/receipt", async (req, res) => {
    try {
        const payment = await loadAuthorizedPayment(req, res);
        if (!payment) return;
        if (payment.status !== 'Approved') {
            return res.status(403).json({ message: "A receipt is available only after admin approval." });
        }
        const p = serializePayment(payment);
        res.json({
            school: "EduGuardian",
            studentName: p.studentName,
            parentName: p.parentName,
            voucherNumber: p.voucher ? p.voucher.voucherNumber : '',
            feeMonth: p.voucher ? `${p.voucher.month} ${p.voucher.year}` : '',
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            transactionId: p.transactionId,
            paymentDate: p.createdAt,
            approvalDate: p.approvedAt,
            approvedBy: p.approvedBy,
            status: "PAID"
        });
    } catch (err) {
        console.error("Fetch receipt error:", err);
        res.status(500).json({ message: "Error fetching receipt" });
    }
});

// Approve (admin) - payment Pending -> Approved, voucher -> Paid
app.put("/api/payments/:id/approve", async (req, res) => {
    try {
        const admin = await getAdminFromRequest(req);
        if (!admin) return res.status(403).json({ message: "Only an admin can approve payments." });
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid payment id." });

        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ message: "Payment not found." });
        if (payment.status !== 'Pending') {
            return res.status(409).json({ message: `Only pending payments can be approved (this one is ${payment.status}).` });
        }
        const fee = await Fee.findById(payment.voucherId);
        if (!fee) return res.status(404).json({ message: "The related fee voucher no longer exists." });
        if (fee.status === 'Paid') {
            return res.status(409).json({ message: "The related voucher is already paid. Reject this payment instead." });
        }

        const now = new Date();
        // Conditional update so two admins clicking at once can't both approve.
        const approved = await Payment.findOneAndUpdate(
            { _id: payment._id, status: 'Pending' },
            { status: 'Approved', approvedBy: admin._id, approvedAt: now },
            { new: true }
        );
        if (!approved) return res.status(409).json({ message: "This payment was already processed." });

        await Fee.findByIdAndUpdate(fee._id, { status: 'Paid', paidAt: now });

        const result = await populatePayment(Payment.findById(payment._id));
        res.json({ message: "Payment approved. Voucher marked as Paid.", payment: serializePayment(result) });
    } catch (err) {
        console.error("Approve payment error:", err);
        res.status(500).json({ message: "Error approving payment" });
    }
});

// Reject (admin) - payment Pending -> Rejected, voucher stays unpaid
app.put("/api/payments/:id/reject", async (req, res) => {
    try {
        const admin = await getAdminFromRequest(req);
        if (!admin) return res.status(403).json({ message: "Only an admin can reject payments." });
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid payment id." });

        const rejected = await Payment.findOneAndUpdate(
            { _id: req.params.id, status: 'Pending' },
            {
                $set: {
                    status: 'Rejected',
                    rejectedBy: admin._id,
                    rejectedAt: new Date(),
                    rejectionReason: String(req.body.reason || '').trim().slice(0, 500)
                },
                // Frees the voucher so the parent can submit a new payment.
                $unset: { activeVoucher: 1 }
            },
            { new: true }
        );
        if (!rejected) {
            const exists = await Payment.exists({ _id: req.params.id });
            return exists
                ? res.status(409).json({ message: "Only pending payments can be rejected." })
                : res.status(404).json({ message: "Payment not found." });
        }

        const result = await populatePayment(Payment.findById(rejected._id));
        res.json({ message: "Payment rejected. Voucher remains unpaid.", payment: serializePayment(result) });
    } catch (err) {
        console.error("Reject payment error:", err);
        res.status(500).json({ message: "Error rejecting payment" });
    }
});





app.get("/api/students/class/:classNo", async (req, res) => {
    try {
        const { classNo } = req.params;
        const students = await Student.find({ classNo: classNo.trim() }).sort({ studentName: 1 }).lean();


        const mappedStudents = students.map(s => ({
            ...s,
            studentId: s._id
        }));

        res.json(mappedStudents);
    } catch (err) {
        res.status(500).json({ message: "Error fetching students for class" });
    }
});

app.post("/api/attendance", async (req, res) => {
    try {
        const { attendanceRecords, date, classNo, subject, markedBy } = req.body;

        if (!attendanceRecords || !attendanceRecords.length) {
            return res.status(400).json({ message: "No attendance records provided" });
        }
        if (!subject || !String(subject).trim()) {
            return res.status(400).json({ message: "Subject is required for attendance." });
        }

        const trimmedSubject = String(subject).trim();
        const searchDate = new Date(date);
        searchDate.setHours(0, 0, 0, 0);

        if (markedBy) {
            const teacher = await Teacher.findOne({ teacherEmail: String(markedBy).toLowerCase().trim() }).lean();
            if (teacher) {
                const auth = await teacherAuthorizedForClassSubject(teacher.teacherEmail, classNo, trimmedSubject);
                if (!auth.ok) {
                    return res.status(403).json({ message: auth.message });
                }
            }
        }

        // Snapshot prior status so re-saving an already-marked day doesn't re-email
        // parents whose child was already Absent - only newly-Absent students should.
        const existingRecords = await Attendance.find({
            studentId: { $in: attendanceRecords.map(r => r.studentId) },
            date: searchDate,
            subject: trimmedSubject
        }).lean();
        const previousStatusByStudent = existingRecords.reduce((map, r) => {
            map[r.studentId] = r.status;
            return map;
        }, {});

        const bulkOps = attendanceRecords.map(record => ({
            updateOne: {
                filter: {
                    studentId: record.studentId,
                    date: searchDate,
                    subject: trimmedSubject
                },
                update: {
                    $set: {
                        studentName: record.studentName,
                        classNo: classNo,
                        status: record.status,
                        subject: trimmedSubject,
                        markedBy: markedBy,
                        date: searchDate
                    }
                },
                upsert: true
            }
        }));

        await Attendance.bulkWrite(bulkOps);
        res.json({ message: `Attendance for ${trimmedSubject} marked successfully!` });

        // Fire-and-forget: email parents of newly-Absent students. Not awaited so
        // the response above doesn't wait on SMTP round trips.
        const newlyAbsent = attendanceRecords.filter(r =>
            r.status === 'Absent' && previousStatusByStudent[r.studentId] !== 'Absent'
        );
        Promise.allSettled(newlyAbsent.map(r => notifications.notifyAbsence({
            studentId: r.studentId,
            studentName: r.studentName,
            classNo,
            date: searchDate,
            subject: trimmedSubject
        }))).catch(err => console.error('Absence notification error:', err));
        return;
    } catch (err) {
        console.error("Attendance save error:", err);
        res.status(500).json({ message: "Error marking attendance" });
    }
});


app.get("/api/attendance/class/:classNo", async (req, res) => {
    try {
        const { classNo } = req.params;
        const { date, subject } = req.query;
        const searchDate = new Date(date);
        searchDate.setHours(0, 0, 0, 0);

        const query = {
            classNo: classNo,
            date: searchDate
        };
        if (subject && String(subject).trim()) {
            query.subject = String(subject).trim();
        }

        const records = await Attendance.find(query);
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: "Error fetching attendance records" });
    }
});

app.get("/api/attendance/student/:studentId", async (req, res) => {
    try {
        const { studentId } = req.params;
        const records = await Attendance.find({ studentId: studentId }).sort({ date: -1, subject: 1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: "Error fetching student attendance history" });
    }
});

// Helper for grade calculation
function calculateGrade(percentage) {
    if (percentage >= 80) return 'A+';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
}

// --- RESULTS ENDPOINTS ---
app.post("/api/results", async (req, res) => {
    try {
        const { results, examType, classNo, expiryDate, markedBy, subject: targetSubject } = req.body;
        const normalizedExpiryDate = new Date(expiryDate);
        normalizedExpiryDate.setHours(23, 59, 59, 999);

        if (!Array.isArray(results) || results.length === 0 || Number.isNaN(normalizedExpiryDate.getTime())) {
            return res.status(400).json({ message: "Valid results and expiry date are required." });
        }

        // Check if markedBy is teacher to enforce subject-wise isolation
        let teacherSubject = null;
        let teacherName = null;
        if (markedBy) {
            const teacher = await Teacher.findOne({ teacherEmail: String(markedBy).toLowerCase().trim() }).lean();
            if (teacher) {
                const subjectToGrade = targetSubject || teacher.subject;
                const auth = await teacherAuthorizedForClassSubject(teacher.teacherEmail, classNo, subjectToGrade);
                if (!auth.ok) {
                    return res.status(403).json({ message: auth.message });
                }
                teacherSubject = subjectToGrade;
                teacherName = teacher.teacherName;
            }
        }
        const cleanTeacherSub = teacherSubject ? teacherSubject.toLowerCase() : null;

        const publishedResults = [];
        for (const rec of results) {
            const existing = await Result.findOne({ studentId: rec.studentId, examType: examType });

            // A teacher save only ever intends to touch their own subject for
            // this student - if it isn't actually present in what was
            // submitted, there's nothing for this student to do here. This is
            // what stops "enter one student's mark, save" from silently
            // zeroing/failing every other student in the class who simply
            // hadn't been graded yet.
            const incomingTeacherSub = cleanTeacherSub
                ? (rec.subjects || []).find(sub => sub.name && sub.name.toLowerCase() === cleanTeacherSub)
                : null;
            if (cleanTeacherSub && !incomingTeacherSub) {
                continue;
            }
            const previousTeacherScore = cleanTeacherSub
                ? existing?.subjects?.find(s => s.name && s.name.toLowerCase() === cleanTeacherSub)?.score
                : undefined;

            let mergedSubjects = rec.subjects || [];

            if (existing && existing.subjects && existing.subjects.length > 0 && teacherSubject) {
                // Keep other subjects untouched, update only teacher's subject
                let matched = false;
                mergedSubjects = existing.subjects.map(s => {
                    if (s.name && s.name.toLowerCase() === cleanTeacherSub && incomingTeacherSub) {
                        matched = true;
                        return incomingTeacherSub;
                    }
                    return s;
                });

                // If teacher's subject was not in existing, append it
                if (incomingTeacherSub && !matched) {
                    mergedSubjects.push(incomingTeacherSub);
                }
            } else if (!existing && teacherSubject) {
                // First teacher entering marks for this exam: save their subject
                if (incomingTeacherSub) {
                    mergedSubjects = [incomingTeacherSub];
                }
            }

            const grandTotal = mergedSubjects.reduce((sum, s) => sum + (Number(s.score) || 0), 0);
            const maxTotal = mergedSubjects.reduce((sum, s) => sum + (Number(s.totalMarks) || 100), 0);
            const percentage = maxTotal > 0 ? (grandTotal / maxTotal) * 100 : 0;
            const grade = calculateGrade(percentage);

            await Result.updateOne(
                { studentId: rec.studentId, examType: examType },
                {
                    $set: {
                        studentName: rec.studentName,
                        classNo: classNo,
                        subjects: mergedSubjects,
                        grandTotal,
                        maxTotal,
                        grade,
                        expiryDate: normalizedExpiryDate,
                        markedBy: markedBy
                    }
                },
                { upsert: true }
            );

            // Only notify when this student's mark for this subject is new or
            // actually changed - re-saving a class where most students are
            // unchanged (e.g. after fixing just one) must not re-email
            // everyone else a second time.
            const scoreChanged = cleanTeacherSub
                ? (incomingTeacherSub?.score !== previousTeacherScore)
                : (!existing || existing.grandTotal !== grandTotal);
            if (!scoreChanged) continue;

            publishedResults.push({
                studentId: rec.studentId,
                studentName: rec.studentName,
                classNo,
                examType,
                grandTotal,
                maxTotal,
                grade,
                subject: teacherSubject,
                teacherName,
                // The subject's own score, distinct from grandTotal (the sum
                // across every subject the student has been graded in so
                // far). A Computer Science teacher's email must show the
                // Computer Science score, not Computer Science + Chemistry
                // + whatever else has already been entered.
                subjectScore: incomingTeacherSub?.score,
                subjectTotalMarks: incomingTeacherSub?.totalMarks
            });
        }

        res.json({ message: "Results published successfully" });

        // Fire-and-forget: email parents only for students whose result
        // actually changed in this save. Not awaited so the response isn't
        // held up by SMTP.
        Promise.allSettled(publishedResults.map(r => notifications.notifyResultPublished(r)))
            .catch(err => console.error('Result notification error:', err));
        return;
    } catch (err) {
        console.error("Result save error:", err);
        res.status(500).json({ message: "Error publishing results" });
    }
});

// Admin-only manual trigger for the daily overdue-fee / late-homework email
// scan, so it can be tested/demoed without waiting for the 07:00 schedule.
app.post("/api/notifications/run-daily-checks", async (req, res) => {
    try {
        const { role } = req.body;
        if (role !== "admin" && role !== "Admin") {
            return res.status(403).json({ message: "Unauthorized" });
        }
        const result = await runDailyChecks();
        res.json({ message: "Daily notification scan complete.", ...result });
    } catch (err) {
        console.error("Manual daily checks error:", err);
        res.status(500).json({ message: "Error running daily notification scan." });
    }
});

app.get("/api/results/student/:studentId", async (req, res) => {
    try {
        const studentId = String(req.params.studentId || '').trim();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const records = await Result.find({
            studentId,
            expiryDate: { $gte: startOfToday }
        }).sort({ updatedAt: -1 });
        res.json(records);
    } catch (err) {
        console.error("Error fetching student results:", err);
        res.status(500).json({ message: "Error fetching results" });
    }
});

app.get("/api/results/class/:classNo", async (req, res) => {
    try {
        const classNo = req.params.classNo?.trim();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const normalizedRegex = new RegExp('^' + classNo.replace(/\s+/g, '\\s*') + '$', 'i');
        const records = await Result.find({
            classNo: normalizedRegex,
            expiryDate: { $gte: startOfToday }
        }).sort({ updatedAt: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: "Error fetching class results" });
    }
});

// --- HOMEWORK ENDPOINTS ---
app.post("/api/homework", upload.single('file'), async (req, res) => {
    try {
        const { title, subject, dueDate, description, classNo, assignedBy } = req.body;

        let filePath = null;
        if (req.file) {
            filePath = req.file.path.replace(/\\/g, '/');
        }
        const fileName = req.file ? req.file.originalname : null;

        const homework = new Homework({
            title,
            subject,
            dueDate: new Date(dueDate),
            description,
            fileName,
            filePath,
            classNo,
            assignedBy
        });

        const savedHomework = await homework.save();

        // Initialize submissions for all students in this class
        const students = await Student.find({ classNo: classNo.trim() });
        if (students.length > 0) {
            const submissions = students.map(s => ({
                homeworkId: savedHomework._id,
                studentId: s._id,
                studentName: s.studentName,
                classNo: classNo,
                status: 'Pending'
            }));
            await HomeworkSubmission.insertMany(submissions);
        }

        res.json({ message: "Homework assigned successfully" });
    } catch (err) {
        console.error("Homework save error:", err);
        res.status(500).json({ message: "Error assigning homework" });
    }
});

app.get("/api/homework/class/:classNo", async (req, res) => {
    try {
        const { classNo } = req.params;
        const homeworks = await Homework.find({
            classNo,
            dueDate: { $gt: new Date() }
        }).sort({ createdAt: -1 });
        res.json(homeworks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching homework" });
    }
});

app.delete("/api/homework/:id", async (req, res) => {
    try {
        await Homework.findByIdAndDelete(req.params.id);
        await HomeworkSubmission.deleteMany({ homeworkId: req.params.id });
        res.json({ message: "Homework deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting homework" });
    }
});

app.put("/api/homework/:id", upload.single('file'), async (req, res) => {
    try {
        const { title, subject, dueDate, description } = req.body;
        const updateData = { title, subject, dueDate: new Date(dueDate), description };

        if (req.file) {
            updateData.filePath = req.file.path.replace(/\\/g, '/');
            updateData.fileName = req.file.originalname;
        }

        await Homework.findByIdAndUpdate(req.params.id, updateData);
        res.json({ message: "Homework updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error updating homework" });
    }
});

app.get("/api/homework/:homeworkId/submissions", async (req, res) => {
    try {
        const { homeworkId } = req.params;
        const submissions = await HomeworkSubmission.find({ homeworkId }).sort({ studentName: 1 });
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ message: "Error fetching submissions" });
    }
});

app.put("/api/homework/submission/:id", async (req, res) => {
    try {
        const { status } = req.body;
        await HomeworkSubmission.findByIdAndUpdate(req.params.id, { status });
        res.json({ message: "Status updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error updating status" });
    }
});

app.get("/api/student/dashboard-stats/:studentId", async (req, res) => {
    try {
        const { studentId } = req.params;
        const pendingSubmissions = await HomeworkSubmission.find({
            studentId,
            status: 'Pending'
        }).populate('homeworkId');

        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        // Filter out expired homework from the pending list
        const activePending = pendingSubmissions.filter(sub =>
            sub.homeworkId && new Date(sub.homeworkId.dueDate) > now
        );

        let isUrgent = false;
        for (const sub of activePending) {
            if (sub.homeworkId && sub.homeworkId.dueDate) {
                const dueDate = new Date(sub.homeworkId.dueDate);
                if (dueDate > now && dueDate <= oneHourFromNow) {
                    isUrgent = true;
                    break;
                }
            }
        }

        // Also check if an exam is coming soon
        const student = await Student.findById(studentId);
        let upcomingExamLabel = 'To Be Announced';
        if (student && student.classNo) {
            const normalizedRegex = new RegExp('^' + student.classNo.replace(/\s+/g, '\\s*') + '$', 'i');
            const latestDatesheet = await Datesheet.findOne({ classNo: normalizedRegex }).sort({ updatedAt: -1 });
            if (latestDatesheet) {
                upcomingExamLabel = latestDatesheet.examType;
            }
        }

        res.json({
            pendingHomework: activePending.length,
            isUrgent: isUrgent,
            upcomingExam: upcomingExamLabel,
            studentClass: student ? student.classNo : 'Unknown'
        });
    } catch (err) {
        console.error("Dashboard stats error:", err);
        res.status(500).json({ message: "Error fetching student stats" });
    }
});

// --- SCHEDULE ENDPOINTS ---
app.post("/api/schedule", async (req, res) => {
    try {
        const { classNo, days } = req.body;

        if (!classNo || !days || !Array.isArray(days)) {
            return res.status(400).json({ message: "Class name and days schedule array are required." });
        }

        // Normalize time strings and interval boundaries for incoming periods
        const normalizedDays = days.map(d => ({
            day: d.day,
            periods: (d.periods || []).map(p => {
                let start = p.startTime || '';
                let end = p.endTime || '';
                let time = p.time || '';

                if ((!start || !end) && time.includes('-')) {
                    const [s, e] = time.split('-');
                    start = s.trim();
                    end = e.trim();
                } else if (start && end && !time) {
                    time = `${start} - ${end}`;
                }

                return {
                    time,
                    startTime: start,
                    endTime: end,
                    subject: (p.subject || '').trim(),
                    teacher: (p.teacher || '').trim(),
                    teacherEmail: (p.teacherEmail || '').toLowerCase().trim()
                };
            })
        }));

        // 1. Conflict Check: In-class overlaps on the same day
        for (const d of normalizedDays) {
            const periods = d.periods;
            for (let i = 0; i < periods.length; i++) {
                const p1 = periods[i];
                const { startMin: s1, endMin: e1 } = parsePeriodInterval(p1);
                if (s1 === null || e1 === null) continue;

                for (let j = i + 1; j < periods.length; j++) {
                    const p2 = periods[j];
                    const { startMin: s2, endMin: e2 } = parsePeriodInterval(p2);
                    if (s2 === null || e2 === null) continue;

                    if (doIntervalsOverlap(s1, e1, s2, e2)) {
                        return res.status(400).json({
                            message: `Conflict: Class ${classNo} already has overlapping periods on ${d.day} (${p1.time} and ${p2.time}).`
                        });
                    }
                }
            }
        }

        // 2. Conflict Check: Across ALL OTHER classes for the same teacher on the same day/time
        const otherSchedules = await Schedule.find({ classNo: { $ne: classNo } }).lean();

        for (const d of normalizedDays) {
            for (const p of d.periods) {
                if (!p.teacherEmail && !p.teacher) continue;

                const { startMin: pStart, endMin: pEnd } = parsePeriodInterval(p);
                if (pStart === null || pEnd === null) continue;

                for (const otherSch of otherSchedules) {
                    const otherDay = (otherSch.days || []).find(od => od.day === d.day);
                    if (!otherDay) continue;

                    for (const op of (otherDay.periods || [])) {
                        const sameEmail = p.teacherEmail && op.teacherEmail && p.teacherEmail.toLowerCase() === op.teacherEmail.toLowerCase();
                        const sameName = p.teacher && op.teacher && p.teacher.toLowerCase() === op.teacher.toLowerCase();

                        if (sameEmail || sameName) {
                            const { startMin: opStart, endMin: opEnd } = parsePeriodInterval(op);
                            if (opStart !== null && opEnd !== null && doIntervalsOverlap(pStart, pEnd, opStart, opEnd)) {
                                return res.status(400).json({
                                    message: `Scheduling Conflict: Teacher "${p.teacher || p.teacherEmail}" is already assigned to Class ${otherSch.classNo} on ${d.day} during ${op.time || (op.startTime + ' - ' + op.endTime)}. Cannot assign overlapping schedule.`
                                });
                            }
                        }
                    }
                }
            }
        }

        // 3. Subject uniqueness and teacher qualification
        const subjectTeachers = new Map();
        for (const d of normalizedDays) {
            for (const p of d.periods) {
                if (!p.subject || (!p.teacherEmail && !p.teacher)) continue;
                const key = normalizeSubject(p.subject);
                const current = subjectTeachers.get(key);
                const identity = (p.teacherEmail || p.teacher).toLowerCase();
                if (current && current !== identity) {
                    return res.status(409).json({
                        message: `${p.subject} is already assigned to another teacher in Class ${classNo}. A second ${p.subject} teacher cannot be assigned.`
                    });
                }
                subjectTeachers.set(key, identity);

                if (p.teacherEmail) {
                    const teacher = await Teacher.findOne({ teacherEmail: p.teacherEmail }).lean();
                    if (teacher && !teacherCanTeach(teacher, p.subject)) {
                        return res.status(403).json({
                            message: `${teacher.teacherName} teaches ${teacher.subject} and cannot take ${p.subject} in the timetable.`
                        });
                    }
                }
            }
        }

        const targetClass = await findClassByLabel(classNo);
        if (targetClass) {
            for (const [subjectKey, identity] of subjectTeachers.entries()) {
                const existing = await TeacherAssignment.findOne({ classId: targetClass._id, subjectKey }).lean();
                if (existing && existing.teacherEmail && existing.teacherEmail.toLowerCase() !== identity) {
                    return res.status(409).json({
                        message: `${existing.subject} is already assigned to ${existing.teacherEmail} in this class. Remove that assignment before assigning a different teacher.`
                    });
                }
            }
        }

        // Save schedule
        const savedSchedule = await Schedule.findOneAndUpdate(
            { classNo },
            { days: normalizedDays },
            { upsert: true, new: true }
        );

        if (targetClass) {
            for (const d of normalizedDays) {
                for (const p of d.periods) {
                    if (p.teacherEmail && p.subject) {
                        const teacher = await Teacher.findOne({ teacherEmail: p.teacherEmail });
                        if (teacher) {
                            await TeacherAssignment.updateOne(
                                { classId: targetClass._id, subjectKey: normalizeSubject(p.subject), academicYear: '2025-26' },
                                {
                                    $setOnInsert: {
                                        teacherId: teacher._id,
                                        teacherEmail: teacher.teacherEmail,
                                        subject: p.subject
                                    }
                                },
                                { upsert: true }
                            );
                        }
                    }
                }
            }
        }

        res.json({ message: "Timetable schedule saved successfully with zero conflicts!", schedule: savedSchedule });
    } catch (err) {
        console.error("Schedule update error:", err);
        res.status(500).json({ message: "Error updating schedule: " + err.message });
    }
});

app.put("/api/fees/:id/approve", async (req, res) => {
    try {
        await Fee.findByIdAndUpdate(req.params.id, { status: "Paid" });
        res.json({ message: "Fee approved" });
    } catch (err) {
        res.status(500).json({ message: "Failed to approve fee" });
    }
});

app.put("/api/fees/:id/reject", async (req, res) => {
    try {
        // Reset status to Pending and clear the receipt path
        await Fee.findByIdAndUpdate(req.params.id, {
            status: "Pending",
            parentReceipt: ""
        });
        res.json({ message: "Fee rejected and reset to pending" });
    } catch (err) {
        res.status(500).json({ message: "Failed to reject fee" });
    }
});

app.get("/api/schedules", async (req, res) => {
    try {
        const schedules = await Schedule.find({}).lean();
        res.json(schedules);
    } catch (err) {
        res.status(500).json({ message: "Error fetching schedules" });
    }
});

app.get("/api/schedule/:classNo", async (req, res) => {
    try {
        const schedule = await Schedule.findOne({ classNo: req.params.classNo });
        res.json(schedule);
    } catch (err) {
        res.status(500).json({ message: "Error fetching schedule" });
    }
});

// --- DATESHEET ENDPOINTS ---
app.post("/api/datesheet", async (req, res) => {
    try {
        const { classNo, examType, exams, markedBy } = req.body;
        console.log(`[AUDIT] Publishing datesheet for Class: "${classNo}", Type: "${examType}", Exams: ${exams?.length}`);

        if (!classNo || !classNo.trim()) {
            return res.status(400).json({ message: "Class is required to publish a datesheet." });
        }
        if (!examType || !examType.trim()) {
            return res.status(400).json({ message: "Exam type is required." });
        }

        // A teacher may only publish/update their own subject's exam entry.
        // Whatever else is in the payload (other subjects, echoed back for
        // display) is ignored rather than trusted - the merge below only ever
        // touches the row matching their own subject, ownership enforced
        // server-side regardless of what the client sends.
        const teacher = markedBy
            ? await Teacher.findOne({ teacherEmail: String(markedBy).toLowerCase().trim() }).lean()
            : null;

        if (teacher) {
            const mySubject = teacher.subject || '';
            const myRow = (exams || []).find(ex => normalizeSubject(ex.subject) === normalizeSubject(mySubject));

            if (myRow) {
                const auth = await teacherAuthorizedForClassSubject(teacher.teacherEmail, classNo, mySubject);
                if (!auth.ok) return res.status(403).json({ message: auth.message });
            }

            const existing = await Datesheet.findOne({ classNo: classNo.trim(), examType: examType.trim() }).lean();
            const otherSubjectsExams = (existing?.exams || []).filter(
                ex => normalizeSubject(ex.subject) !== normalizeSubject(mySubject)
            );
            // Omitting the row (e.g. the teacher cleared it) removes it - the
            // merge only ever adds/updates/removes their own subject's entry.
            const mergedExams = myRow ? [...otherSubjectsExams, myRow] : otherSubjectsExams;

            const result = await Datesheet.findOneAndUpdate(
                { classNo: classNo.trim(), examType: examType.trim() },
                { exams: mergedExams },
                { upsert: true, new: true }
            );
            console.log(`[AUDIT] Datesheet saved with _id: ${result._id}, classNo: "${result.classNo}" (teacher: ${teacher.teacherEmail}, subject: ${mySubject})`);
            return res.json({ message: "Datesheet updated successfully" });
        }

        // Admin (or no teacher match): unrestricted full replace, as before.
        const result = await Datesheet.findOneAndUpdate(
            { classNo: classNo.trim(), examType: examType.trim() },
            { exams },
            { upsert: true, new: true }
        );
        console.log(`[AUDIT] Datesheet saved with _id: ${result._id}, classNo: "${result.classNo}"`);
        res.json({ message: "Datesheet updated successfully" });
    } catch (err) {
        console.error("Datesheet save error:", err);
        res.status(500).json({ message: "Error updating datesheet" });
    }
});

app.get("/api/datesheet/:classNo", async (req, res) => {
    try {
        const classNo = req.params.classNo?.trim();
        console.log(`[DATESHEET FETCH] Looking for datesheets for class: "${classNo}"`);
        // Use a case-insensitive regex that ignores extra spaces between name and section
        const normalizedRegex = new RegExp('^' + classNo.replace(/\s+/g, '\\s*') + '$', 'i');
        const datesheets = await Datesheet.find({ classNo: normalizedRegex }).sort({ updatedAt: -1 });
        console.log(`[DATESHEET FETCH] Found ${datesheets.length} datesheets for class "${classNo}"`);
        res.json(datesheets);
    } catch (err) {
        console.error("Datesheet fetch error:", err);
        res.status(500).json({ message: "Error fetching datesheets" });
    }
});

// Global upload error handler
app.use((err, req, res, next) => {
    if (!err) {
        return next();
    }

    console.error("Upload Error:", err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'System supports only up to 10 MB for uploads.' });
    }

    if (err.message && err.message.includes('Only images, videos, and documents are allowed')) {
        return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: err.message || 'Server error during file upload' });
});

app.use(express.static(path.join(__dirname, "../frontend/dist")));



app.get("/api/notifications/admin", (req, res) => {
    const alerts = [...adminAlertQueue];
    adminAlertQueue = [];
    res.json(alerts);
});

app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});
