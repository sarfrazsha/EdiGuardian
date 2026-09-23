const Parent = require('../models/parent');
const { sendMail } = require('./mailer');

// --- shared email shell -----------------------------------------------

function wrapEmail(title, bodyHtml) {
    return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
        <div style="background:#14243F; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <span style="color:#ffffff; font-size: 20px; font-weight: bold; letter-spacing: 0.3px;">EduGuardian</span>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <h2 style="margin-top:0; color:#14243F; font-size: 18px;">${title}</h2>
            ${bodyHtml}
            <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
                This is an automated message from EduGuardian. Please do not reply to this email.
            </p>
        </div>
    </div>`;
}

function formatDate(d) {
    if (!d) return 'N/A';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// --- parent lookup -------------------------------------------------------

async function getParentForStudent(studentId) {
    if (!studentId) return null;
    try {
        return await Parent.findOne({ studentIds: studentId }).lean();
    } catch (err) {
        console.error('[notifications] Parent lookup failed:', err.message);
        return null;
    }
}

// --- individual notifications --------------------------------------------

// Student marked Absent for a class/subject/date.
async function notifyAbsence({ studentId, studentName, classNo, date, subject }) {
    const parent = await getParentForStudent(studentId);
    if (!parent || !parent.parentEmail) {
        console.warn(`[notifications] No parent email found for absent student ${studentName} (${studentId}).`);
        return;
    }
    const html = wrapEmail('Attendance Alert: Marked Absent', `
        <p>Dear ${parent.parentName || 'Parent/Guardian'},</p>
        <p><strong>${studentName}</strong> (Class ${classNo}) was marked <strong style="color:#b91c1c;">Absent</strong>
        for <strong>${subject}</strong> on <strong>${formatDate(date)}</strong>.</p>
        <p>If this is unexpected, please contact the school office.</p>
    `);
    await sendMail({
        to: parent.parentEmail,
        subject: `Attendance Alert: ${studentName} marked absent (${subject})`,
        html
    });
}

// A result has been published/updated for a student. `subject`/`teacherName`
// are only present for a teacher's own-subject save (admin saves touch the
// whole sheet at once, so there's no single subject to name). `subjectScore`/
// `subjectTotalMarks` are that subject's own marks - distinct from
// `grandTotal`/`maxTotal`, which sum every subject graded so far and must
// never be presented as if they were one subject's score.
async function notifyResultPublished({ studentId, studentName, classNo, examType, grandTotal, maxTotal, grade, subject, teacherName, subjectScore, subjectTotalMarks }) {
    const parent = await getParentForStudent(studentId);
    if (!parent || !parent.parentEmail) {
        console.warn(`[notifications] No parent email found for result of student ${studentName} (${studentId}).`);
        return;
    }
    const hasSubjectScore = subject && subjectScore !== undefined && subjectTotalMarks;
    const percentage = maxTotal > 0 ? ((grandTotal / maxTotal) * 100).toFixed(1) : '0.0';
    const subjectPercentage = hasSubjectScore ? ((subjectScore / subjectTotalMarks) * 100).toFixed(1) : null;

    const html = wrapEmail('New Result Published', `
        <p>Dear ${parent.parentName || 'Parent/Guardian'},</p>
        <p>A new result has been published for <strong>${studentName}</strong> (Class ${classNo}).</p>
        <table style="border-collapse: collapse; margin: 12px 0; width: 100%;">
            <tr><td style="padding:4px 8px; color:#6b7280;">Exam</td><td style="padding:4px 8px;"><strong>${examType}</strong></td></tr>
            ${subject ? `<tr><td style="padding:4px 8px; color:#6b7280;">Subject</td><td style="padding:4px 8px;"><strong>${subject}</strong></td></tr>` : ''}
            ${teacherName ? `<tr><td style="padding:4px 8px; color:#6b7280;">Teacher</td><td style="padding:4px 8px;"><strong>${teacherName}</strong></td></tr>` : ''}
            ${hasSubjectScore
                ? `<tr><td style="padding:4px 8px; color:#6b7280;">${subject} Score</td><td style="padding:4px 8px;"><strong>${subjectScore} / ${subjectTotalMarks} (${subjectPercentage}%)</strong></td></tr>`
                : `<tr><td style="padding:4px 8px; color:#6b7280;">Score</td><td style="padding:4px 8px;"><strong>${grandTotal} / ${maxTotal} (${percentage}%)</strong></td></tr>`
            }
            ${hasSubjectScore ? `<tr><td style="padding:4px 8px; color:#6b7280;">Overall Total (all subjects so far)</td><td style="padding:4px 8px;"><strong>${grandTotal} / ${maxTotal} (${percentage}%)</strong></td></tr>` : ''}
            <tr><td style="padding:4px 8px; color:#6b7280;">${hasSubjectScore ? 'Overall Grade' : 'Grade'}</td><td style="padding:4px 8px;"><strong>${grade}</strong></td></tr>
        </table>
        <p>Log in to EduGuardian to view the full subject-wise breakdown.</p>
    `);
    await sendMail({
        to: parent.parentEmail,
        subject: `New Result Published: ${studentName} - ${examType}${subject ? ` (${subject})` : ''}`,
        html
    });
}

// A fee voucher's due date has passed and it is still unpaid.
// Fee already stores parentEmail directly, so no Parent lookup is needed.
async function notifyFeeOverdue(fee) {
    if (!fee.parentEmail) {
        console.warn(`[notifications] Fee ${fee._id} has no parentEmail on file.`);
        return;
    }
    const period = fee.year ? `${fee.month} ${fee.year}` : fee.month;
    const html = wrapEmail('Fee Payment Overdue', `
        <p>Dear Parent/Guardian,</p>
        <p>The fee voucher for <strong>${fee.studentName}</strong> (Class ${fee.classNo || 'N/A'}) for
        <strong>${period}</strong> was due on <strong>${formatDate(fee.dueDate)}</strong> and is still unpaid.</p>
        <table style="border-collapse: collapse; margin: 12px 0; width: 100%;">
            <tr><td style="padding:4px 8px; color:#6b7280;">Amount Due</td><td style="padding:4px 8px;"><strong>Rs. ${fee.amount}</strong></td></tr>
            <tr><td style="padding:4px 8px; color:#6b7280;">Due Date</td><td style="padding:4px 8px;"><strong>${formatDate(fee.dueDate)}</strong></td></tr>
        </table>
        <p>Please submit payment and upload your receipt in EduGuardian as soon as possible to avoid further delay.</p>
    `);
    await sendMail({
        to: fee.parentEmail,
        subject: `Fee Overdue: ${fee.studentName} - ${period}`,
        html
    });
}

// A homework's due date has passed and the student's submission is still Pending.
async function notifyHomeworkLate({ studentId, studentName, classNo, homeworkTitle, subject, dueDate }) {
    const parent = await getParentForStudent(studentId);
    if (!parent || !parent.parentEmail) {
        console.warn(`[notifications] No parent email found for late homework of student ${studentName} (${studentId}).`);
        return;
    }
    const html = wrapEmail('Assignment Not Submitted', `
        <p>Dear ${parent.parentName || 'Parent/Guardian'},</p>
        <p><strong>${studentName}</strong> (Class ${classNo}) did not submit the following assignment by its due date:</p>
        <table style="border-collapse: collapse; margin: 12px 0; width: 100%;">
            <tr><td style="padding:4px 8px; color:#6b7280;">Assignment</td><td style="padding:4px 8px;"><strong>${homeworkTitle}</strong></td></tr>
            <tr><td style="padding:4px 8px; color:#6b7280;">Subject</td><td style="padding:4px 8px;"><strong>${subject}</strong></td></tr>
            <tr><td style="padding:4px 8px; color:#6b7280;">Due Date</td><td style="padding:4px 8px;"><strong>${formatDate(dueDate)}</strong></td></tr>
        </table>
        <p>Please follow up with ${studentName} regarding this assignment.</p>
    `);
    await sendMail({
        to: parent.parentEmail,
        subject: `Assignment Late: ${studentName} - ${homeworkTitle}`,
        html
    });
}

module.exports = {
    notifyAbsence,
    notifyResultPublished,
    notifyFeeOverdue,
    notifyHomeworkLate
};
