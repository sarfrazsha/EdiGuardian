const mongoose = require("mongoose");
const schema = mongoose.Schema;

const ScheduleSchema = new schema({
    classNo: {
        type: String,
        required: true,
        unique: true
    },
    days: [{
        day: String,
        periods: [{
            time: String,
            startTime: String,
            endTime: String,
            subject: String,
            teacher: String,
            teacherEmail: String
        }]
    }]
}, { timestamps: true });

const Schedule = mongoose.model("schedule", ScheduleSchema);
module.exports = Schedule;
