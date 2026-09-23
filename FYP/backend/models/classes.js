const mongoose= require("mongoose");
const Schema= mongoose.Schema;

const Class = new Schema({
        
        className: {
            type: String,
            required: true,
            validate: {
                validator: value => /^(?:[1-9]|1[0-2])$/.test(String(value).trim()),
                message: 'Class must be between 1 and 12.'
            }
        },
        section:{
            type: String,
            required: true,
            trim: true,
            uppercase: true
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




