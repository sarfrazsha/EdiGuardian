// Builds a student's progress report from the data the school already records:
// published results, attendance, homework submissions and fee vouchers
// (including fines). Everything is computed on request, so the report is
// always current. Remarks are rule-based and use the student's first name
// only (no pronouns).

const Student = require('../models/student');
const Result = require('../models/result');
const Attendance = require('../models/attendance');
const Homework = require('../models/homework');
const HomeworkSubmission = require('../models/homework_submission');
const Fee = require('../models/fee');

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
const round1 = (n) => Math.round(n * 10) / 10;

function ratingFor(score) {
    if (score === null) return null;
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Satisfactory';
    return 'Needs Improvement';
}

// Same thresholds as result publishing (calculateGrade in app.js).
function gradeFor(percentage) {
    if (percentage >= 80) return 'A+';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
}

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

// Fee dueDate is stored as "YYYY-MM-DD"; compare as a local calendar date.
function parseDueDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

// --- sections ------------------------------------------------------------

function buildAcademics(results) {
    // Oldest first so the trend reads left-to-right.
    const exams = results
        .slice()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(r => {
            const percentage = pct(r.grandTotal, r.maxTotal) ?? 0;
            return {
                examType: r.examType,
                percentage,
                grade: r.grade || gradeFor(percentage),
                passed: !['F', 'Fail'].includes(r.grade),
                grandTotal: r.grandTotal,
                maxTotal: r.maxTotal,
                date: r.updatedAt || r.createdAt
            };
        });

    if (!exams.length) return { hasData: false, exams: [], subjects: [] };

    // Subject averages across all exams.
    const bySubject = new Map();
    results.forEach(r => (r.subjects || []).forEach(s => {
        if (!s.totalMarks) return;
        const key = s.name || s.subjectId;
        if (!bySubject.has(key)) bySubject.set(key, []);
        bySubject.get(key).push({ examType: r.examType, percentage: (s.score / s.totalMarks) * 100, score: s.score, totalMarks: s.totalMarks });
    }));
    const subjects = [...bySubject.entries()].map(([name, list]) => {
        const average = round1(list.reduce((sum, x) => sum + x.percentage, 0) / list.length);
        return { name, average, grade: gradeFor(average), exams: list.length, best: round1(Math.max(...list.map(x => x.percentage))) };
    }).sort((a, b) => b.average - a.average);

    const average = round1(exams.reduce((sum, e) => sum + e.percentage, 0) / exams.length);
    const latest = exams[exams.length - 1];
    const previous = exams.length > 1 ? exams[exams.length - 2] : null;

    return {
        hasData: true,
        exams,
        average,
        grade: gradeFor(average),
        latest,
        trend: previous ? round1(latest.percentage - previous.percentage) : null,
        previousExam: previous ? previous.examType : null,
        subjects,
        strongest: subjects.length > 1 ? subjects[0] : null,
        weakest: subjects.length > 1 ? subjects[subjects.length - 1] : null
    };
}

function buildAttendance(records) {
    if (!records.length) return { hasData: false };
    const present = records.filter(r => r.status === 'Present').length;
    const since = startOfDay(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent = records.filter(r => new Date(r.date) >= since);
    const recentPresent = recent.filter(r => r.status === 'Present').length;

    const bySubject = new Map();
    records.forEach(r => {
        if (!bySubject.has(r.subject)) bySubject.set(r.subject, { subject: r.subject, total: 0, present: 0 });
        const row = bySubject.get(r.subject);
        row.total++;
        if (r.status === 'Present') row.present++;
    });

    // Days on which the student missed at least one class.
    const absentDays = new Set(records.filter(r => r.status === 'Absent').map(r => startOfDay(r.date).getTime()));

    return {
        hasData: true,
        total: records.length,
        present,
        absent: records.length - present,
        percentage: pct(present, records.length),
        absentDays: absentDays.size,
        last30: { total: recent.length, present: recentPresent, absent: recent.length - recentPresent, percentage: pct(recentPresent, recent.length) },
        bySubject: [...bySubject.values()]
            .map(r => ({ ...r, percentage: pct(r.present, r.total) }))
            .sort((a, b) => a.percentage - b.percentage),
        recentAbsences: records
            .filter(r => r.status === 'Absent')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 6)
            .map(r => ({ date: r.date, subject: r.subject }))
    };
}

function buildHomework(homeworks, submissions) {
    if (!homeworks.length) return { hasData: false };
    const now = new Date();
    const statusOf = new Map(submissions.map(s => [String(s.homeworkId), s.status]));

    const items = homeworks.map(h => {
        const submitted = statusOf.get(String(h._id)) === 'Submitted';
        const due = new Date(h.dueDate);
        return {
            title: h.title,
            subject: h.subject,
            dueDate: h.dueDate,
            status: submitted ? 'Submitted' : due < now ? 'Missed' : 'Upcoming'
        };
    });

    const submitted = items.filter(i => i.status === 'Submitted').length;
    const missed = items.filter(i => i.status === 'Missed').length;
    const upcoming = items.filter(i => i.status === 'Upcoming').length;

    const bySubject = new Map();
    items.forEach(i => {
        if (!bySubject.has(i.subject)) bySubject.set(i.subject, { subject: i.subject, assigned: 0, submitted: 0, missed: 0 });
        const row = bySubject.get(i.subject);
        row.assigned++;
        if (i.status === 'Submitted') row.submitted++;
        if (i.status === 'Missed') row.missed++;
    });

    return {
        hasData: true,
        assigned: items.length,
        submitted,
        missed,
        upcoming,
        // Rate over homework that could have been submitted by now.
        completionRate: pct(submitted, submitted + missed),
        bySubject: [...bySubject.values()],
        recent: items.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)).slice(0, 8)
    };
}

function buildFees(fees) {
    if (!fees.length) return { hasData: false, fines: { count: 0, total: 0, items: [] } };
    const today = startOfDay(new Date());
    const unpaid = fees.filter(f => f.status === 'Pending');
    const overdue = unpaid.filter(f => {
        const due = parseDueDate(f.dueDate);
        return due && due < today;
    });
    const fined = fees.filter(f => f.fineAmount > 0);

    return {
        hasData: true,
        total: fees.length,
        paid: fees.filter(f => f.status === 'Paid').length,
        underReview: fees.filter(f => f.status === 'Review').length,
        pending: unpaid.length,
        overdue: overdue.length,
        outstandingAmount: unpaid.reduce((sum, f) => sum + (f.amount || 0), 0),
        totalDiscount: fees.reduce((sum, f) => sum + (f.discountAmount || 0), 0),
        fines: {
            count: fined.length,
            total: fined.reduce((sum, f) => sum + f.fineAmount, 0),
            items: fined
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map(f => ({ month: f.month, year: f.year, amount: f.fineAmount, reason: f.fineReason || 'Fine', status: f.status }))
        }
    };
}

// --- overall score + remarks ------------------------------------------------

const WEIGHTS = { academics: 0.5, attendance: 0.3, homework: 0.2 };

function buildOverall(academics, attendance, homework) {
    const components = [];
    if (academics.hasData) components.push({ key: 'academics', label: 'Academics', score: academics.average, weight: WEIGHTS.academics });
    if (attendance.hasData) components.push({ key: 'attendance', label: 'Attendance', score: attendance.percentage, weight: WEIGHTS.attendance });
    if (homework.hasData && homework.completionRate !== null) components.push({ key: 'homework', label: 'Homework', score: homework.completionRate, weight: WEIGHTS.homework });

    if (!components.length) return { score: null, rating: null, components };
    // Re-normalise weights over the areas that actually have data.
    const weightSum = components.reduce((s, c) => s + c.weight, 0);
    const score = Math.round(components.reduce((s, c) => s + c.score * c.weight, 0) / weightSum);
    return {
        score,
        rating: ratingFor(score),
        components: components.map(c => ({ ...c, weight: Math.round((c.weight / weightSum) * 100) }))
    };
}

function buildRemarks(firstName, overall, academics, attendance, homework, fees) {
    const strengths = [];
    const improvements = [];
    const recommendations = [];
    const summary = [];

    if (overall.score !== null) {
        summary.push(`${firstName}'s overall progress is rated "${overall.rating}" with a combined score of ${overall.score}%.`);
    }

    if (academics.hasData) {
        const a = academics.average;
        const level = a >= 80 ? 'performing excellently' : a >= 65 ? 'doing well' : a >= 50 ? 'making steady progress' : 'finding the coursework challenging';
        summary.push(`Academically, ${firstName} is ${level}, averaging ${a}% across ${academics.exams.length} exam${academics.exams.length === 1 ? '' : 's'} (grade ${academics.grade}).`);
        if (academics.trend !== null) {
            if (academics.trend >= 3) strengths.push(`Improved by ${academics.trend}% from ${academics.previousExam} to ${academics.latest.examType}.`);
            else if (academics.trend <= -3) improvements.push(`Scores dropped by ${Math.abs(academics.trend)}% from ${academics.previousExam} to ${academics.latest.examType}.`);
        }
        if (academics.strongest && academics.weakest && academics.strongest.average - academics.weakest.average >= 5) {
            strengths.push(`Strongest subject: ${academics.strongest.name} (${academics.strongest.average}%).`);
            if (academics.weakest.average < 70) {
                improvements.push(`${academics.weakest.name} needs more attention (${academics.weakest.average}%).`);
                recommendations.push(`Set aside regular revision time for ${academics.weakest.name} and review past test mistakes together.`);
            }
        }
        const failing = academics.subjects.filter(s => s.average < 50);
        if (failing.length) {
            improvements.push(`Below passing level in: ${failing.map(s => s.name).join(', ')}.`);
            recommendations.push(`Speak with the subject teacher${failing.length > 1 ? 's' : ''} about extra support for ${failing.map(s => s.name).join(', ')}.`);
        }
        if (a >= 80) {
            strengths.push(academics.exams.length > 1
                ? `Consistently high academic performance (${a}% average).`
                : `High academic performance (${a}% in ${academics.latest.examType}).`);
        }
    }

    if (attendance.hasData) {
        const p = attendance.percentage;
        if (p >= 90) strengths.push(`Excellent attendance (${p}%).`);
        else if (p < 75) {
            improvements.push(`Attendance is low at ${p}% (${attendance.absent} missed class${attendance.absent === 1 ? '' : 'es'}).`);
            recommendations.push('Regular attendance is strongly linked to results - aim for at least 90%.');
        } else {
            summary.push(`Attendance is ${p}%.`);
        }
        if (attendance.last30.absent >= 3) {
            improvements.push(`${attendance.last30.absent} classes missed in the last 30 days.`);
        }
    }

    if (homework.hasData) {
        const c = homework.completionRate;
        if (c !== null && c >= 90) strengths.push(`Reliable with homework (${c}% completed on time).`);
        else if (c !== null && c < 70) {
            improvements.push(`Homework completion is ${c}% (${homework.missed} assignment${homework.missed === 1 ? '' : 's'} missed).`);
            recommendations.push('Check the homework list together each evening so assignments are not missed.');
        } else if (homework.missed > 0) {
            improvements.push(`${homework.missed} homework assignment${homework.missed === 1 ? ' was' : 's were'} missed.`);
        }
        if (homework.upcoming > 0) {
            recommendations.push(`${homework.upcoming} homework assignment${homework.upcoming === 1 ? ' is' : 's are'} due soon.`);
        }
    }

    if (fees.hasData) {
        if (fees.overdue > 0) {
            recommendations.push(`${fees.overdue} fee voucher${fees.overdue === 1 ? ' is' : 's are'} overdue - please clear the outstanding Rs ${fees.outstandingAmount.toLocaleString()}.`);
        }
        if (fees.fines.count > 0) {
            improvements.push(`${fees.fines.count} fine${fees.fines.count === 1 ? '' : 's'} issued (Rs ${fees.fines.total.toLocaleString()} total): ${[...new Set(fees.fines.items.map(f => f.reason))].join(', ')}.`);
        }
    }

    if (!strengths.length && overall.score !== null && overall.score >= 65) strengths.push('Steady, balanced progress across all areas.');
    if (!recommendations.length) recommendations.push(`Keep up the good work and continue encouraging ${firstName}'s daily routine.`);

    return { summary: summary.join(' '), strengths, improvements, recommendations };
}

// --- entry point -------------------------------------------------------------

async function buildProgressReport(studentId) {
    const student = await Student.findById(studentId).lean();
    if (!student) return null;
    const sid = String(student._id);

    const [results, attendanceRecords, homeworks, submissions, fees] = await Promise.all([
        Result.find({ studentId: sid }).lean(),
        Attendance.find({ studentId: sid }).lean(),
        Homework.find({ classNo: student.classNo }).lean(),
        HomeworkSubmission.find({ studentId: sid }).lean(),
        Fee.find({ $or: [{ studentId: student._id }, { studentId: null, studentName: student.studentName, classNo: student.classNo }] }).lean()
    ]);

    const academics = buildAcademics(results);
    const attendance = buildAttendance(attendanceRecords);
    const homework = buildHomework(homeworks, submissions);
    const feeSummary = buildFees(fees);
    const overall = buildOverall(academics, attendance, homework);
    const firstName = String(student.studentName || 'The student').trim().split(/\s+/)[0];

    return {
        generatedAt: new Date(),
        student: {
            id: sid,
            name: student.studentName,
            rollNo: student.studentRollNo,
            classNo: student.classNo,
            image: student.studentImage || ''
        },
        overall,
        academics,
        attendance,
        homework,
        fees: feeSummary,
        remarks: buildRemarks(firstName, overall, academics, attendance, homework, feeSummary)
    };
}

module.exports = { buildProgressReport };
