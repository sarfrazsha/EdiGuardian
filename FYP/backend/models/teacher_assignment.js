const mongoose = require('mongoose');

const TeacherAssignmentSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'teacher',
        required: true
    },
    teacherEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'class',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    subjectKey: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    academicYear: {
        type: String,
        trim: true,
        default: '2025-26'
    }
}, { timestamps: true });

TeacherAssignmentSchema.index(
    { classId: 1, academicYear: 1, subjectKey: 1 },
    { unique: true }
);

module.exports = mongoose.model('teacher_assignment', TeacherAssignmentSchema);
