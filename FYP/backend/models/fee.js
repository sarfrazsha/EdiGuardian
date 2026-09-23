const mongoose = require("mongoose");
const schema = mongoose.Schema;

const Fee = new schema(
    {
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
        amount: {
            type: Number,
            required: true
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
        adminVoucher: {
            type: String,
            required: true
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
