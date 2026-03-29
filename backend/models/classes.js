const mongoose= require("mongoose");
const Schema= mongoose.Schema;

const Class = new Schema({
        
        className: {
            type:String
        },
        section:{
            type: String
        },
        teacherId:{
            type: String,
            ref:'teacher'
        },
        teacherEmail:{
            type: String,
            ref:'teacher'
        }
})

const classes= mongoose.model("class",Class);
module.exports=classes;




