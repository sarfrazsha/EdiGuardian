const mongoose = require("mongoose")
const schema = mongoose.Schema;

const Student = new schema(
    {

        studentId: String,
        classNo: {
            type: String 
        },
        studentName: {
            type: String,
            required: true
        },
        studentAge: {
            type: Number,
            required: true,
            max: [15, 'Age cannot exceed 15']
        },
        studentRollNo: {
            type: String,
            required: true
        },
        studentGender: {
            type: String,
            required: true
        },
        studentEmail: {
            type: String,
            required: true,
            match: [/^.*@gmail\.com$/, 'Email must end with @gmail.com']
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
