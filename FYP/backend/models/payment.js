const mongoose = require("mongoose");
const schema = mongoose.Schema;

// Online payment attempt against a fee voucher, processed by the built-in
// sandbox gateway (no real gateway, no real money). No real financial data is
// stored: only the last 4 digits of the card / wallet number are kept and
// CVV / PIN never reach the server.
//   Successful - payment went through; the voucher is marked Paid immediately
//   Failed     - attempt did not go through (see failureReason)
//   Pending / Approved / Rejected - older admin-reviewed payments, still
//                supported so existing records keep working.
const Payment = new schema(
    {
        transactionId: {
            type: String,
            required: true,
            unique: true
        },
        voucherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'fee',
            required: true
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'student'
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'parent',
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        paymentMethod: {
            type: String,
            // Legacy 'Mock ...' values are kept only so existing records validate.
            enum: ['Card', 'JazzCash', 'Easypaisa', 'Mock Card', 'Mock JazzCash', 'Mock Easypaisa'],
            required: true
        },
        accountHolder: {
            type: String,
            trim: true,
            default: ''
        },
        accountLast4: {
            type: String
        },
        status: {
            type: String,
            enum: ['Successful', 'Failed', 'Pending', 'Approved', 'Rejected'],
            default: 'Pending'
        },
        // Sandbox test scenario the attempt was run with, and why it failed.
        scenario: {
            type: String,
            default: ''
        },
        failureReason: {
            type: String,
            default: ''
        },
        rejectionReason: {
            type: String,
            default: ''
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
            default: null
        },
        approvedAt: {
            type: Date,
            default: null
        },
        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin',
            default: null
        },
        rejectedAt: {
            type: Date,
            default: null
        },
        // Set to the voucherId while the payment is Successful, Pending or
        // Approved; never set on Failed and unset on rejection. The unique index below means a voucher can have
        // at most one live (pending/approved) payment, even under races.
        activeVoucher: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    { timestamps: true }
);

Payment.index(
    { activeVoucher: 1 },
    { unique: true, partialFilterExpression: { activeVoucher: { $exists: true } } }
);

const payment = mongoose.model("payment", Payment);
module.exports = payment;
