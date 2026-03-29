const mongoose = require("mongoose");
const schema = mongoose.Schema;

const AttendanceSchema = new schema({
    studentId: {
        type: String,
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    classNo: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Present', 'Absent'],
        required: true
    },
    markedBy: {
        type: String,
        required: true
    }
}, { timestamps: true });


AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: false }); 

const Attendance = mongoose.model("attendance", AttendanceSchema);
module.exports = Attendance;
