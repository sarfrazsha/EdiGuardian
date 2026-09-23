const mongoose = require("mongoose");
const schema = mongoose.Schema;

const HomeworkSubmissionSchema = new schema({
    homeworkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'homework',
        required: true
    },
    studentId: {
        type: String, // Student _id
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
    status: {
        type: String,
        enum: ['Pending', 'Submitted'],
        default: 'Pending'
    },
    lateNotifiedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Ensure one status per student per homework
HomeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });

const HomeworkSubmission = mongoose.model("homework_submission", HomeworkSubmissionSchema);
module.exports = HomeworkSubmission;
