const mongoose = require("mongoose")
const schema = mongoose.Schema;

const Teacher = new schema(
    {
        teacher_id: String,
        teacherName:{
            type: String,
            required:true
        },
        teacherContact:{
            type: String,
            required:true
        },
        teacherClass:{
            type: String,
            required:true
        },
        teacherAddress:{
            type:String,
            required:true
        },
     
        teacherEmail:{
            type: String,
            required: true
        } ,
        teacherPassword:{
            type: String,
            required: true
        },
        role:{
            type: String,
            required: true
        }
    
    }
)

const teacher= mongoose.model("teacher",Teacher);
module.exports=teacher;