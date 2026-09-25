const Parent = require('../models/parent');
const { sendMail } = require('./mailer');
const { renderVoucherHtml, voucherNumberFor, escapeHtml } = require('./feeVoucher');

// Public base URL of the app, used for "view voucher online" links in emails.
const APP_URL = (process.env.APP_URL || 'http://localhost:8080').replace(/\/+$/, '');

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

function feeAmountRows(fee) {
    const original = fee.originalAmount ?? fee.amount;
    return `
        <tr><td style="padding:4px 8px; color:#6b7280;">Fee Amount</td><td style="padding:4px 8px;">Rs. ${original}</td></tr>
        ${fee.discountAmount > 0 ? `<tr><td style="padding:4px 8px; color:#6b7280;">Discount (${fee.discountPercent}%)</td><td style="padding:4px 8px; color:#047857;">- Rs. ${fee.discountAmount}</td></tr>` : ''}
        ${fee.fineAmount > 0 ? `<tr><td style="padding:4px 8px; color:#6b7280;">Fine${fee.fineReason ? ` (${escapeHtml(fee.fineReason)})` : ''}</td><td style="padding:4px 8px; color:#b91c1c;">+ Rs. ${fee.fineAmount}</td></tr>` : ''}
        <tr><td style="padding:4px 8px; color:#6b7280;">Net Payable</td><td style="padding:4px 8px;"><strong>Rs. ${fee.amount}</strong></td></tr>`;
}

function voucherAttachment(fee) {
    return {
        filename: `Fee-Voucher-${voucherNumberFor(fee)}.html`,
        content: renderVoucherHtml(fee),
        contentType: 'text/html'
    };
}

// New fee voucher(s) generated for a parent. One email per parent listing
// every voucher issued to them in this batch (several children and/or
// several months), each voucher attached as a printable HTML file.
async function notifyFeesIssued({ parentEmail, parentName, fees }) {
    if (!parentEmail || !fees || !fees.length) return { sent: false, skipped: true };

    const blocks = fees.map(fee => `
        <div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px 12px; margin:12px 0;">
            <div style="font-weight:bold; color:#14243F;">${escapeHtml(fee.studentName)} &middot; Class ${escapeHtml(fee.classNo || 'N/A')} &middot; ${escapeHtml(fee.month)} ${fee.year}</div>
            <table style="border-collapse: collapse; margin-top: 6px; width: 100%;">
                <tr><td style="padding:4px 8px; color:#6b7280;">Voucher No.</td><td style="padding:4px 8px;">${voucherNumberFor(fee)}</td></tr>
                ${feeAmountRows(fee)}
                <tr><td style="padding:4px 8px; color:#6b7280;">Due Date</td><td style="padding:4px 8px;"><strong>${formatDate(fee.dueDate)}</strong></td></tr>
            </table>
            <a href="${APP_URL}/api/fees/${fee._id}/voucher" style="font-size:13px; color:#1d4ed8;">View / print voucher online</a>
        </div>`).join('');

    const html = wrapEmail(fees.length > 1 ? 'New Fee Vouchers Issued' : 'New Fee Voucher Issued', `
        <p>Dear ${escapeHtml(parentName || 'Parent/Guardian')},</p>
        <p>The following fee voucher${fees.length > 1 ? 's have' : ' has'} been issued. The printable voucher${fees.length > 1 ? 's are' : ' is'} attached to this email.</p>
        ${blocks}
        <p>You can pay online or upload your bank receipt from the <strong>My Fees</strong> section in EduGuardian.</p>
    `);

    const first = fees[0];
    const subject = fees.length > 1
        ? `Fee Vouchers Issued (${fees.length})`
        : `Fee Voucher Issued: ${first.studentName} - ${first.month} ${first.year}`;

    return sendMail({
        to: parentEmail,
        subject,
        html,
        attachments: fees.map(voucherAttachment)
    });
}

// Reminder sent the day before an unpaid voucher's due date.
async function notifyFeeDueTomorrow(fee) {
    if (!fee.parentEmail) {
        console.warn(`[notifications] Fee ${fee._id} has no parentEmail on file.`);
        return { sent: false, skipped: true };
    }
    const period = fee.year ? `${fee.month} ${fee.year}` : fee.month;
    const html = wrapEmail('Fee Due Tomorrow', `
        <p>Dear Parent/Guardian,</p>
        <p>This is a reminder that the fee voucher for <strong>${escapeHtml(fee.studentName)}</strong> (Class ${escapeHtml(fee.classNo || 'N/A')})
        for <strong>${escapeHtml(period)}</strong> is due <strong>tomorrow, ${formatDate(fee.dueDate)}</strong>.</p>
        <table style="border-collapse: collapse; margin: 12px 0; width: 100%;">
            <tr><td style="padding:4px 8px; color:#6b7280;">Voucher No.</td><td style="padding:4px 8px;">${voucherNumberFor(fee)}</td></tr>
            ${feeAmountRows(fee)}
        </table>
        <p>Please pay before the due date to avoid the voucher becoming overdue.
        <a href="${APP_URL}/api/fees/${fee._id}/voucher" style="color:#1d4ed8;">View / print voucher</a></p>
    `);
    return sendMail({
        to: fee.parentEmail,
        subject: `Reminder: Fee due tomorrow - ${fee.studentName} (${period})`,
        html,
        attachments: [voucherAttachment(fee)]
    });
}

// One-time code to confirm an online fee payment. Unlike the other
// notifications, the caller needs to know whether it was delivered, so the
// sendMail result is returned.
async function notifyPaymentOtp({ to, parentName, code, minutes, fee, paymentMethod, accountLast4 }) {
    const html = wrapEmail('Payment Verification Code', `
        <p>Dear ${escapeHtml(parentName || 'Parent/Guardian')},</p>
        <p>Use the code below to confirm your fee payment of <strong>Rs. ${fee.amount}</strong>
        for <strong>${escapeHtml(fee.studentName)}</strong> (${escapeHtml(fee.month)} ${fee.year})
        via ${escapeHtml(paymentMethod)} •••• ${escapeHtml(accountLast4)}.</p>
        <div style="text-align:center; margin: 20px 0;">
            <span style="display:inline-block; font-size: 30px; font-weight: bold; letter-spacing: 8px; color:#14243F; background:#f3f4f6; padding: 12px 24px; border-radius: 8px;">${code}</span>
        </div>
        <p>This code expires in <strong>${minutes} minutes</strong> and can be used only once.</p>
        <p style="color:#b91c1c;">Never share this code with anyone. If you did not try to make this payment, please ignore this email.</p>
    `);
    return sendMail({
        to,
        subject: `${code} is your EduGuardian payment verification code`,
        html
    });
}

// Confirmation after a successful online payment (voucher now Under Review). `payment` is a serialized
// payment (see serializePayment in app.js) plus parentEmail and school.
async function notifyPaymentReceived(payment) {
    if (!payment.parentEmail) return { sent: false, skipped: true };
    const v = payment.voucher || {};
    const method = payment.accountLast4 ? `${payment.paymentMethod} (•••• ${payment.accountLast4})` : payment.paymentMethod;
    const html = wrapEmail('Payment Received', `
        <p>Dear ${escapeHtml(payment.parentName || 'Parent/Guardian')},</p>
        <p>We have received your fee payment for <strong>${escapeHtml(payment.studentName)}</strong>. Thank you!
        The payment is now under review; the voucher will be marked Paid once the school verifies it.</p>
        <table style="border-collapse: collapse; margin: 12px 0; width: 100%;">
            <tr><td style="padding:4px 8px; color:#6b7280;">Transaction ID</td><td style="padding:4px 8px;"><strong>${escapeHtml(payment.transactionId)}</strong></td></tr>
            <tr><td style="padding:4px 8px; color:#6b7280;">Voucher No.</td><td style="padding:4px 8px;">${escapeHtml(v.voucherNumber || '')}</td></tr>
            <tr><td style="padding:4px 8px; color:#6b7280;">Fee Month</td><td style="padding:4px 8px;">${escapeHtml(`${v.month || ''} ${v.year || ''}`)}</td></tr>
            <tr><td style="padding:4px 8px; color:#6b7280;">Amount Paid</td><td style="padding:4px 8px;"><strong>Rs. ${payment.amount}</strong></td></tr>
            <tr><td style="padding:4px 8px; color:#6b7280;">Payment Method</td><td style="padding:4px 8px;">${escapeHtml(method)}</td></tr>
            <tr><td style="padding:4px 8px; color:#6b7280;">Date</td><td style="padding:4px 8px;">${new Date(payment.createdAt).toLocaleString('en-GB')}</td></tr>
            <tr><td style="padding:4px 8px; color:#6b7280;">Status</td><td style="padding:4px 8px; color:#b45309;"><strong>Under Review</strong></td></tr>
        </table>
        <p>You can view and print the receipt from the <strong>My Fees</strong> section in EduGuardian.</p>
    `);
    return sendMail({
        to: payment.parentEmail,
        subject: `Payment Received: ${payment.studentName} - ${v.month || ''} ${v.year || ''} (${payment.transactionId})`,
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
    notifyFeesIssued,
    notifyFeeDueTomorrow,
    notifyPaymentOtp,
    notifyPaymentReceived,
    notifyHomeworkLate
};
