const mongoose = require("mongoose")
const schema = mongoose.Schema;

const Teacher = new schema(
    {
        
        teacherName:{
            type: String,
            required:true
        },
        teacherContact:{
            type: String,
            required:true,
            match: [/^\d{11}$/, 'Phone number must be exactly 11 digits.']
        },

        teacherAddress:{
            type:String,
            required:true
        },
     
        teacherEmail:{
            type: String,
            required: true,
            match: [/^.*@gmail\.com$/, 'Email must end with @gmail.com']
        } ,
        teacherPassword:{
            type: String,
            required: true
        },
        teacherProfile:{
            type:String
        }
       
    
    }
)

const teacher= mongoose.model("teacher",Teacher);
module.exports=teacher;