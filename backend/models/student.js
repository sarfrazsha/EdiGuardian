const mongoose = require("mongoose")
const schema = mongoose.Schema;

const Student = new schema(
    {

        studentId: String,
        classNo: {
            type: String // Class association
        },
        studentName: {
            type: String,
            required: true
        },
        studentAge: {
            type: Number,
            required: true
        },
        studentRollNo: {
            type: Number,
            required: true
        },
        studentGender: {
            type: String,
            required: true
        },
        studentEmail: {
            type: String,
            required: true
        },
        studentPassword: {
            type: String,
            required: true
        },
        studentRole: String
    }
)

const student = mongoose.model("student", Student);
module.exports = student;
