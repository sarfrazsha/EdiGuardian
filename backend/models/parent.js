const mongoose = require("mongoose")
const schema = mongoose.Schema;

const Parent = new schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:'student'
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
            type: String,
            required: true,
            match: [/^\d{11}$/, 'Phone number must be exactly 11 digits.']
        },
        parentAddress: {
            type: String,
            required: true
        },
        parentEmail: {
            type: String,
            required: true,
            match: [/^.*@gmail\.com$/, 'Email must end with @gmail.com']
        },
        parentPassword: {
            type: String,
            required: true
        },
        parentImage:{
            type:String
        }
        
    }
)

const parent = mongoose.model("parent", Parent);
module.exports = parent;