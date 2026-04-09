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
        }
    },
    { timestamps: true }
);

const fee = mongoose.model("fee", Fee);
module.exports = fee;
