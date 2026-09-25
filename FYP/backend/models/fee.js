const mongoose = require("mongoose");
const schema = mongoose.Schema;

const Fee = new schema(
    {
        // Set on system-generated vouchers. Older, manually-issued vouchers
        // only carry studentName/parentEmail.
        studentId: {
            type: schema.Types.ObjectId,
            ref: 'student',
            default: null
        },
        studentName: {
            type: String,
            required: true
        },
        classNo: {
            type: String
        },
        parentEmail: {
            type: String,
            required: true
        },
        // Net payable amount (after discount). Payments are checked against this.
        amount: {
            type: Number,
            required: true
        },
        // Fee before discount, and the discount applied to reach `amount`.
        originalAmount: {
            type: Number,
            default: null
        },
        discountPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        discountAmount: {
            type: Number,
            default: 0
        },
        // Fine added on top of the discounted fee (e.g. late fee, lost book).
        fineAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        fineReason: {
            type: String,
            trim: true,
            default: ''
        },
        dueDate: {
            type: String,
            required: true
        },
        month: {
            type: String,
            required: true
        },
        year: {
            type: Number,
            required: true,
            default: () => new Date().getFullYear()
        },
        // Uploaded voucher file (legacy manual issue). System-generated
        // vouchers leave this empty and are rendered by /api/fees/:id/voucher.
        adminVoucher: {
            type: String,
            required: false
        },
        parentReceipt: {
            type: String,
            required: false
        },
        status: {
            type: String,
            enum: ['Pending', 'Review', 'Paid'],
            default: 'Pending'
        },
        issueNotifiedAt: {
            type: Date,
            default: null
        },
        dueReminderSentAt: {
            type: Date,
            default: null
        },
        overdueNotifiedAt: {
            type: Date,
            default: null
        },
        // When this fee's status actually became 'Paid' - distinct from
        // `month`/`year`, which name the billing period the voucher is FOR,
        // not when it was settled. "Total fee collected in September" means
        // payments that landed in September, which may be for a different
        // month's voucher paid late (or early).
        paidAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

const fee = mongoose.model("fee", Fee);
module.exports = fee;
