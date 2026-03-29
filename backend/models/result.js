const mongoose= require("mongoose");
const Schema= mongoose.Schema;

const Result=new Schema(
    {
        
        studentId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'student'
        },
        teacherId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'teacher'
        },
        subject:{
            type:String,
            required: true
        },
        obtainedMarks:{
            type: mongoose.Schema.Types.Decimal128,
            required: true
        },
        totalMarks:{
            type: Number,
            required:true
        },
        ExamType:{
            type:String,
            required:true
        }},
        {timestamps:true});

const result=mongoose.model("result",Result);
module.exports=result;








