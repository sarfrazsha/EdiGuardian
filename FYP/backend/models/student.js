const mongoose = require("mongoose")
const schema = mongoose.Schema;

const Student = new schema(
    {


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
            max: [22, 'Age cannot exceed 22'],
            min: [3, 'Age cannot be less than 3']
        },
        studentRollNo: {
            type: String,
            unique: true,
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
        studentImage: {
            type: String,

        }

    }
)

const student = mongoose.model("student", Student);
module.exports = student;
