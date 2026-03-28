const mongoose = require("mongoose");
const Fee = require("./models/fee");
mongoose.connect('mongodb://127.0.0.1:27017/FYP').then(async () => {
    const fees = await Fee.find({});
    fees.forEach(f => {
        console.log(`[Fee ID: ${f._id}] Email: ${f.parentEmail} | Class: ${f.classNo} | Student: ${f.studentName} | Status: ${f.status}`);
    });
    process.exit(0);
}).catch(console.error);
