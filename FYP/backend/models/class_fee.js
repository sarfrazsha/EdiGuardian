const mongoose = require("mongoose");
const schema = mongoose.Schema;

// Standard monthly fee per class (e.g. "5 - A"). Saved whenever the admin
// generates vouchers so the Issue Fees form can pre-fill it next time.
const ClassFee = new schema(
    {
        classNo: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        monthlyFee: {
            type: Number,
            required: true,
            min: 1
        }
    },
    { timestamps: true }
);

const classFee = mongoose.model("class_fee", ClassFee);
module.exports = classFee;
