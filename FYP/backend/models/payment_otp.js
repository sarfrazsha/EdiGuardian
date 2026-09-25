const mongoose = require("mongoose");
const schema = mongoose.Schema;

// One-time code emailed to the parent to confirm an online payment. Only a
// salted hash of the code is stored. The OTP is bound to the voucher and the
// payment details it was requested for, is valid for 2 minutes, allows a
// limited number of wrong attempts and can be used once.
const PaymentOtp = new schema(
    {
        parentId: {
            type: schema.Types.ObjectId,
            ref: 'parent',
            required: true
        },
        voucherId: {
            type: schema.Types.ObjectId,
            ref: 'fee',
            required: true
        },
        paymentMethod: {
            type: String,
            required: true
        },
        accountLast4: {
            type: String,
            required: true
        },
        codeHash: {
            type: String,
            required: true
        },
        salt: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        },
        attempts: {
            type: Number,
            default: 0
        },
        consumedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// MongoDB removes OTP records automatically an hour after they expire.
PaymentOtp.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

const paymentOtp = mongoose.model("payment_otp", PaymentOtp);
module.exports = paymentOtp;
