/**
 * Seeds a full 12-class school: classes 1-12 (section A), at least 10 students
 * (with linked parents, Pakistani names) per class, a dedicated teacher pool
 * (2 teachers per subject, shared across classes), and a conflict-free weekly
 * timetable for every class.
 *
 * Behaviour, as agreed with the project owner:
 *   - Classes 1-5 and their existing students/parents are left untouched.
 *   - Class 12 is fully wiped (students, their dedicated parents, attendance,
 *     the class document itself) and rebuilt from scratch.
 *   - Every class ends up with at least 10 students.
 *   - Every class (1-12) gets a fresh, conflict-free weekly timetable, since
 *     the existing timetables were incomplete legacy demo data.
 *
 * Two phases:
 *   1. Direct MongoDB cleanup (wipe class 12, clear stale assignments/schedules)
 *      - there's no safe cascading-delete HTTP endpoint for this.
 *   2. HTTP calls against the running backend (http://localhost:8080) to
 *      create classes/students/teachers/timetables, so every write goes
 *      through the same validation and conflict-checking the real app uses.
 *
 * Usage: start the backend first (`node app.js` in FYP/backend), then run
 *   node scripts/seedFullSchool.js
 */

const mongoose = require('mongoose');

const API_BASE = process.env.SEED_API_BASE || 'http://localhost:8080';
const MONGO_URI = 'mongodb://127.0.0.1:27017/FYP';

const STUDENTS_PER_CLASS_MIN = 10;
const TEACHERS_PER_SUBJECT = 2;
const STUDENT_PASSWORD = 'Student@123';
const PARENT_PASSWORD = 'Parent@123';
const TEACHER_PASSWORD = 'Teacher@123';

const SUBJECTS = ['Mathematics', 'English', 'Urdu', 'Physics', 'Chemistry', 'Computer Science'];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Six periods/day, matching the time pattern already used elsewhere in the app.
const TIME_SLOTS = [
    ['08:00', '08:40'], ['08:45', '09:25'], ['09:30', '10:10'],
    ['10:30', '11:10'], ['11:15', '11:55'], ['12:00', '12:40']
];

// --- Pakistani name pools -------------------------------------------------

const MALE_FIRST_NAMES = [
    'Ahmed', 'Ali', 'Bilal', 'Usman', 'Hamza', 'Zain', 'Hassan', 'Hussain',
    'Umar', 'Faisal', 'Kamran', 'Imran', 'Tariq', 'Shahid', 'Waqas', 'Adeel',
    'Rizwan', 'Nauman', 'Saad', 'Danish', 'Fahad', 'Junaid', 'Kashif',
    'Salman', 'Yasir', 'Zeeshan', 'Arslan', 'Talha', 'Haris', 'Owais'
];
const FEMALE_FIRST_NAMES = [
    'Ayesha', 'Fatima', 'Zainab', 'Mariam', 'Sana', 'Hina', 'Amna', 'Saba',
    'Nida', 'Sadia', 'Rabia', 'Aiman', 'Iqra', 'Mahnoor', 'Komal', 'Anum',
    'Noreen', 'Farah', 'Shazia', 'Bushra', 'Sobia', 'Rimsha', 'Laiba',
    'Areeba', 'Hafsa', 'Warda'
];
const FAMILY_NAMES = [
    'Khan', 'Malik', 'Sheikh', 'Raza', 'Siddiqui', 'Qureshi', 'Chaudhry',
    'Baig', 'Farooq', 'Iqbal', 'Javed', 'Abbasi', 'Rana', 'Butt', 'Cheema',
    'Awan', 'Mughal', 'Bhatti', 'Niazi', 'Soomro', 'Bukhari', 'Gilani',
    'Zaidi', 'Naqvi'
];

let usedEmails = new Set();
let usedRollNos = new Set();
let usedTeacherNames = new Set();

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomDigits(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
    return s;
}
function pakistaniPhone() { return '03' + randomDigits(9); } // 11 digits total

function uniqueEmail(firstName, lastName, seenSet) {
    const base = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '');
    let email = `${base}@gmail.com`;
    let n = 1;
    while (seenSet.has(email)) {
        email = `${base}${n}@gmail.com`;
        n++;
    }
    seenSet.add(email);
    return email;
}

function personName() {
    const gender = Math.random() < 0.5 ? 'Male' : 'Female';
    const first = pick(gender === 'Male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
    const last = pick(FAMILY_NAMES);
    return { first, last, gender, full: `${first} ${last}` };
}

function makeStudentParentPayload(classNum, seq) {
    const student = personName();
    // Parent shares the family name (common convention); parent's own first
    // name/gender is independent of the child's.
    const parentPerson = personName();
    const parentName = `${parentPerson.first} ${student.last}`;

    let rollNo;
    do {
        rollNo = `${String(seq).padStart(2, '0')}-${classNum}A`;
    } while (usedRollNos.has(rollNo));
    usedRollNos.add(rollNo);

    return {
        studentName: student.full,
        studentAge: Math.min(22, Math.max(3, classNum + 5)),
        studentRollNo: rollNo,
        studentGender: student.gender,
        studentEmail: uniqueEmail(student.first, student.last + seq + classNum, usedEmails),
        studentPassword: STUDENT_PASSWORD,
        studentClass: `${classNum} - A`,
        parentName,
        parentPhone: pakistaniPhone(),
        parentAddress: `House ${randomDigits(3)}, Street ${randomDigits(2)}, Lahore`,
        parentEmail: uniqueEmail(parentPerson.first, student.last + seq + classNum, usedEmails),
        parentPassword: PARENT_PASSWORD
    };
}

// --- HTTP helpers ----------------------------------------------------------

async function apiJson(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

async function apiForm(method, path, fields) {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    const res = await fetch(`${API_BASE}${path}`, { method, body: form });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

// --- Phase 0: direct DB cleanup ---------------------------------------------

async function wipeClass12AndStaleScheduleData() {
    const Class = require('../models/classes');
    const Student = require('../models/student');
    const Parent = require('../models/parent');
    const Attendance = require('../models/attendance');
    const Result = require('../models/result');
    const HomeworkSubmission = require('../models/homework_submission');
    const TeacherAssignment = require('../models/teacher_assignment');
    const Schedule = require('../models/schedule');

    await mongoose.connect(MONGO_URI);

    const cls12 = await Class.findOne({ className: '12', section: 'A' });
    if (cls12) {
        const students = await Student.find({ classNo: '12 - A' });
        const studentIds = students.map(s => s._id);
        const studentIdStrings = studentIds.map(id => id.toString());

        await Attendance.deleteMany({ studentId: { $in: studentIdStrings } });
        await Result.deleteMany({ studentId: { $in: studentIdStrings } });
        await HomeworkSubmission.deleteMany({ studentId: { $in: studentIdStrings } });

        // Unlink these students from any parent; delete parents left with none.
        const parents = await Parent.find({ studentIds: { $in: studentIds } });
        for (const p of parents) {
            p.studentIds = p.studentIds.filter(id => !studentIds.some(sid => sid.equals(id)));
            if (p.studentIds.length === 0) {
                await Parent.deleteOne({ _id: p._id });
            } else {
                await p.save();
            }
        }

        await Student.deleteMany({ _id: { $in: studentIds } });
        await TeacherAssignment.deleteMany({ classId: cls12._id });
        await Schedule.deleteOne({ classNo: '12 - A' });
        await Class.deleteOne({ _id: cls12._id });
        console.log(`[wipe] Class 12 - A cleared: ${students.length} students, ${parents.length} parent(s) processed.`);
    } else {
        console.log('[wipe] Class 12 - A did not exist, nothing to clear.');
    }

    // The whole school's timetable is being regenerated fresh, so drop every
    // existing (mostly-empty legacy) schedule and assignment rather than
    // trying to reconcile around them.
    const assignmentsCleared = await TeacherAssignment.deleteMany({});
    const schedulesCleared = await Schedule.deleteMany({});
    console.log(`[wipe] Cleared ${assignmentsCleared.deletedCount} teacher assignment(s), ${schedulesCleared.deletedCount} schedule(s) for a fresh rebuild.`);

    // How many students does each class still need to reach the minimum?
    const need = {};
    for (let c = 1; c <= 12; c++) {
        const count = await Student.countDocuments({ classNo: `${c} - A` });
        const shortfall = Math.max(0, STUDENTS_PER_CLASS_MIN - count);
        if (shortfall > 0) need[c] = shortfall;
    }

    await mongoose.disconnect();
    return need;
}

// --- Phase 1: classes ------------------------------------------------------

async function ensureAllClassesExist() {
    const { data: classes } = await apiJson('GET', '/api/classes');
    const existing = new Set((classes || []).map(c => `${c.name}-${c.section}`));
    for (let c = 1; c <= 12; c++) {
        const key = `${c}-A`;
        if (existing.has(key)) continue;
        const result = await apiJson('POST', '/api/classes', { name: String(c), section: 'A', teacher: '', teacherEmail: '' });
        if (!result.ok) throw new Error(`Failed to create class ${c} - A: ${JSON.stringify(result.data)}`);
        console.log(`[classes] Created class ${c} - A.`);
    }
}

async function getClassMap() {
    const { data: classes } = await apiJson('GET', '/api/classes');
    const map = {};
    (classes || []).forEach(c => { map[c.name] = c; });
    return map;
}

// --- Phase 2: students + parents -------------------------------------------

async function seedStudentsForClass(classNum, count) {
    let created = 0;
    for (let seq = 1; seq <= count; seq++) {
        let attempt = 0;
        let payload = makeStudentParentPayload(classNum, seq);
        while (attempt < 5) {
            const result = await apiForm('POST', '/students', payload);
            if (result.ok) {
                created++;
                break;
            }
            // Roll number / email collision: regenerate and retry.
            attempt++;
            payload = makeStudentParentPayload(classNum, seq + 1000 + attempt);
            if (attempt === 5) {
                console.error(`[students] Failed to create student ${seq} for class ${classNum} - A: ${JSON.stringify(result.data)}`);
            }
        }
    }
    console.log(`[students] Class ${classNum} - A: created ${created}/${count} student(s).`);
}

// --- Phase 3: teacher pool ---------------------------------------------------

async function buildTeacherPool() {
    const { data: existingTeachers } = await apiJson('GET', '/api/teachers');
    const pool = {}; // subject -> [{ teacherName, teacherEmail }, ...]

    // Every existing teacher's display name is off-limits for newly generated
    // ones - the schedule's conflict check matches teachers by name as well as
    // email, so two different teachers sharing a name get treated as the same
    // person and produce false-positive scheduling conflicts.
    (existingTeachers || []).forEach(t => usedTeacherNames.add(t.teacherName));

    for (const subject of SUBJECTS) {
        const reusable = (existingTeachers || []).filter(t => (t.subject || '') === subject);
        pool[subject] = reusable.slice(0, TEACHERS_PER_SUBJECT).map(t => ({ teacherName: t.teacherName, teacherEmail: t.email }));

        while (pool[subject].length < TEACHERS_PER_SUBJECT) {
            const person = personName();
            let teacherName = `${person.first} ${pick(FAMILY_NAMES)}`;
            while (usedTeacherNames.has(teacherName)) {
                teacherName = `${person.first} ${pick(FAMILY_NAMES)}`;
            }
            usedTeacherNames.add(teacherName);
            const email = uniqueEmail(person.first, person.last + subject.replace(/\s+/g, ''), usedEmails);
            const result = await apiForm('POST', '/users', {
                teacherName,
                phoneNumber: pakistaniPhone(),
                email,
                password: TEACHER_PASSWORD,
                address: `House ${randomDigits(3)}, Model Town, Lahore`,
                subject,
                subjects: subject
            });
            if (!result.ok) {
                console.error(`[teachers] Failed to create teacher for ${subject}: ${JSON.stringify(result.data)}`);
                break;
            }
            pool[subject].push({ teacherName, teacherEmail: email });
            console.log(`[teachers] Created ${teacherName} (${subject}).`);
        }
    }
    return pool;
}

// --- Phase 4: timetable ------------------------------------------------------

// With 6 subjects and 12 classes, exactly two classes need the same subject at
// any given moment (12 / 6 = 2) - one more than one subject-teacher can cover
// alone, which is exactly why there are 2 teachers per subject.
//
// For class index c (0-11), day d (0-5), period i (0-5): subject index is
// (i + c + d) % 6. Fixing (d, i), the two classes that land on the same
// subject index are always exactly 6 apart (c and c+6) - never any other
// pairing - because c and c+6 are the only two values in 0..11 congruent mod
// 6. Splitting the teacher pool by that same boundary (c < 6 -> teacher A,
// c >= 6 -> teacher B) guarantees those two classes always get different
// teachers, so no teacher is ever double-booked, however many classes share
// a subject.
function buildWeekForClass(classIndex, teacherPool) {
    const days = DAYS.map((day, d) => {
        const periods = TIME_SLOTS.map(([startTime, endTime], i) => {
            const subject = SUBJECTS[(i + classIndex + d) % SUBJECTS.length];
            const teachers = teacherPool[subject];
            const teacherHalf = Math.floor(classIndex / 6) % teachers.length;
            const teacher = teachers[teacherHalf];
            return { startTime, endTime, subject, teacher: teacher.teacherName, teacherEmail: teacher.teacherEmail };
        });
        return { day, periods };
    });
    return days;
}

async function seedTimetables(teacherPool) {
    for (let c = 1; c <= 12; c++) {
        const days = buildWeekForClass(c - 1, teacherPool);
        const result = await apiJson('POST', '/api/schedule', { classNo: `${c} - A`, days });
        if (!result.ok) {
            console.error(`[timetable] Class ${c} - A: FAILED - ${JSON.stringify(result.data)}`);
        } else {
            console.log(`[timetable] Class ${c} - A: timetable saved (${days.length} days x ${TIME_SLOTS.length} periods).`);
        }
    }
}

// --- Main --------------------------------------------------------------------

async function main() {
    console.log(`Seeding against ${API_BASE} ...`);

    const ping = await fetch(`${API_BASE}/api/test`).catch(() => null);
    if (!ping || !ping.ok) {
        console.error(`Backend not reachable at ${API_BASE}. Start it first (node app.js) and try again.`);
        process.exit(1);
    }

    const studentShortfallByClass = await wipeClass12AndStaleScheduleData();

    await ensureAllClassesExist();

    for (let c = 1; c <= 12; c++) {
        const need = studentShortfallByClass[c] || 0;
        if (need > 0) {
            await seedStudentsForClass(c, need);
        } else {
            console.log(`[students] Class ${c} - A already has >= ${STUDENTS_PER_CLASS_MIN} students, skipping.`);
        }
    }

    const teacherPool = await buildTeacherPool();

    await seedTimetables(teacherPool);

    console.log('\nDone.');
    console.log(`Default passwords - students: ${STUDENT_PASSWORD}, parents: ${PARENT_PASSWORD}, new teachers: ${TEACHER_PASSWORD}`);
}

main().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
