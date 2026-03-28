const mongoose = require("mongoose");
const fs = require("fs");
const Fee = require("./models/fee");
mongoose.connect('mongodb://127.0.0.1:27017/FYP').then(async () => {
    const fees = await Fee.find({});
    const output = fees.map(f => ({
        _id: f._id,
        parentEmail: f.parentEmail,
        hasAdminVoucher: !!f.adminVoucherBase64,
        voucherLength: f.adminVoucherBase64 ? f.adminVoucherBase64.length : 0
    }));
    fs.writeFileSync("voucher_output.json", JSON.stringify(output, null, 2));
    process.exit(0);
}).catch(console.error);
