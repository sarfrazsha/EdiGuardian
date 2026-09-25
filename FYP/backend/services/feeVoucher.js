// Renders a system-generated fee voucher as a standalone, printable HTML page.
// Used both by GET /api/fees/:id/voucher (open in browser -> Print / Save as PDF)
// and as the attachment on the "fee issued" email.

const SCHOOL_NAME = process.env.SCHOOL_NAME || 'EduGuardian School';

function voucherNumberFor(fee) {
    return `VCH-${fee._id.toString().slice(-8).toUpperCase()}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(d) {
    if (!d) return 'N/A';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function money(n) {
    return `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
}

// `student` is optional ({ studentRollNo }) - only used to print the roll number.
function renderVoucherHtml(fee, student = null) {
    const voucherNo = voucherNumberFor(fee);
    const original = fee.originalAmount ?? fee.amount;
    const discountPercent = fee.discountPercent || 0;
    const discountAmount = fee.discountAmount || 0;
    const paid = fee.status === 'Paid';

    const copy = (label) => `
    <div class="copy">
        <div class="head">
            <div class="school">${escapeHtml(SCHOOL_NAME)}</div>
            <div class="label">${label}</div>
        </div>
        <table class="info">
            <tr><td>Voucher No.</td><td><b>${voucherNo}</b></td></tr>
            <tr><td>Student</td><td><b>${escapeHtml(fee.studentName)}</b></td></tr>
            ${student && student.studentRollNo ? `<tr><td>Roll No.</td><td>${escapeHtml(student.studentRollNo)}</td></tr>` : ''}
            <tr><td>Class</td><td>${escapeHtml(fee.classNo || 'N/A')}</td></tr>
            <tr><td>Fee Month</td><td>${escapeHtml(fee.month)} ${escapeHtml(fee.year)}</td></tr>
            <tr><td>Issue Date</td><td>${formatDate(fee.createdAt || new Date())}</td></tr>
            <tr><td>Due Date</td><td><b>${formatDate(fee.dueDate)}</b></td></tr>
        </table>
        <table class="amounts">
            <tr><th>Description</th><th class="r">Amount</th></tr>
            <tr><td>Monthly Tuition Fee</td><td class="r">${money(original)}</td></tr>
            ${discountAmount > 0 ? `<tr class="disc"><td>Discount (${discountPercent}%)</td><td class="r">- ${money(discountAmount)}</td></tr>` : ''}
            ${fee.fineAmount > 0 ? `<tr class="fine"><td>Fine${fee.fineReason ? ` (${escapeHtml(fee.fineReason)})` : ''}</td><td class="r">+ ${money(fee.fineAmount)}</td></tr>` : ''}
            <tr class="total"><td>Net Payable</td><td class="r">${money(fee.amount)}</td></tr>
        </table>
        ${paid ? '<div class="stamp">PAID</div>' : ''}
        <p class="note">Please pay on or before the due date. Keep this copy for your record.</p>
        <div class="sign">Authorized Signature</div>
    </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fee Voucher ${voucherNo}</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 16px; background: #f3f4f6; }
    .toolbar { text-align: center; margin-bottom: 12px; }
    .toolbar button { background: #14243F; color: #fff; border: 0; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-size: 14px; }
    .sheet { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
    .copy { position: relative; background: #fff; border: 1px dashed #9ca3af; padding: 14px; width: 320px; font-size: 12px; }
    .head { background: #14243F; color: #fff; padding: 8px 10px; margin: -14px -14px 10px; }
    .school { font-weight: bold; font-size: 15px; }
    .label { font-size: 11px; opacity: .85; text-transform: uppercase; letter-spacing: .5px; }
    table { width: 100%; border-collapse: collapse; }
    .info td { padding: 3px 0; }
    .info td:first-child { color: #6b7280; width: 40%; }
    .amounts { margin-top: 10px; border: 1px solid #d1d5db; }
    .amounts th, .amounts td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    .amounts th { background: #f3f4f6; }
    .r { text-align: right !important; }
    .disc td { color: #047857; }
    .fine td { color: #b91c1c; }
    .total td { font-weight: bold; font-size: 13px; background: #f9fafb; }
    .note { color: #6b7280; font-size: 10px; margin: 10px 0 24px; }
    .sign { border-top: 1px solid #9ca3af; width: 60%; margin-left: auto; text-align: center; padding-top: 4px; font-size: 10px; color: #6b7280; }
    .stamp { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-18deg); border: 3px solid #16a34a; color: #16a34a; font-size: 34px; font-weight: bold; padding: 4px 16px; opacity: .35; }
    @media print {
        @page { size: A4 landscape; margin: 8mm; }
        body { background: #fff; padding: 0; }
        .toolbar { display: none; }
        .sheet { flex-wrap: nowrap; }
        .head, .amounts th, .total td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
</style>
</head>
<body>
    <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
    <div class="sheet">
        ${copy('Parent Copy')}
        ${copy('School Copy')}
        ${copy('Bank Copy')}
    </div>
</body>
</html>`;
}

module.exports = { renderVoucherHtml, voucherNumberFor, escapeHtml, SCHOOL_NAME };
