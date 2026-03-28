const mongoose = require("mongoose")
const schema = mongoose.Schema;

const Admin = new schema(
    {
        adminId:String,
        adminName:{
            type: String,
            required:true
        },
         adminPhone:{
            type: Number,
            required:true
        },
        adminEmail:{
            type:String,
            required:true
        },
        
        adminPassword:{
            type: String,
            required: true
        },
      
    
    }
)

const admin= mongoose.model("admin",Admin);
module.exports=admin;