const mongoose = require("mongoose")
const schema = mongoose.Schema;

const Parent = new schema(
    {
        studentId: {
            type: String,
            ref: 'student'
        },
        parentId: {
            type: String
        },
        classNo: {
            type: String // To associate a parent's student with a specific class
        },
        parentName: {
            type: String,
            required: true
        },
        parentPhone: {
            type: Number,
            required: true
        },
        parentAddress: {
            type: String,
            required: true
        },
        parentEmail: {
            type: String,
            required: true
        },
        parentPassword: {
            type: String,
            required: true
        },
        parentRole: String
    }
)

const parent = mongoose.model("parent", Parent);
module.exports = parent;