const mongoose= require("mongoose");
const Schema= mongoose.Schema;

const Homework= new Schema({
    classId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'class'
    },
    teacherId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'teacher'
    },
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    Due_Date:{
        type:Date,
        default:Date.now,
        required:true

    },


},{timestamps:true});

const homework=mongoose.model("homework",Homework);
module.exports=homework;