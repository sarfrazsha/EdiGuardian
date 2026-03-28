const mongoose = require("mongoose");
const fs = require("fs");
const Fee = require("./models/fee");
mongoose.connect('mongodb://127.0.0.1:27017/FYP').then(async () => {
    const fees = await Fee.find({}, { adminVoucherBase64: 0, parentReceiptBase64: 0 });
    fs.writeFileSync("test_output.json", JSON.stringify(fees, null, 2));
    process.exit(0);
}).catch(console.error);
