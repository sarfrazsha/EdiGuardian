const mongoose = require("mongoose");
const schema = mongoose.Schema;

// Simulated (mock) online payment against a fee voucher. No real gateway is
// involved and no real financial data is stored: card/wallet numbers are
// dummy values and only their last 4 digits are kept; CVV/PIN never reach
// the server. A payment stays 'Pending' until an admin approves or rejects it.
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
            enum: ['Mock Card', 'Mock JazzCash', 'Mock Easypaisa'],
            required: true
        },
        accountLast4: {
            type: String
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending'
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
        // Set to the voucherId while the payment is Pending or Approved and
        // unset on rejection. The unique index below means a voucher can have
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
