const mongoose=require('mongoose')
    const userSchema=new mongoose.Schema({
        Name:{
            type: String,
            required: true,
            unique: true,
        },
        Pp:{
            type:String,
            required:false,
            default:'user.avif',
        },
        online:{
            type:Number,
            required:false,
        },
        password:{
            type: String,
            required:true,
        },
        contacts:{
            type:[String],
            require:false,
            default:[],
        },
    },{timestamps:true})
    const User=mongoose.model("users",userSchema);

    const userChat=new mongoose.Schema({
        SenderName:{
            type:String,
            required:true,
        },
        ReceiverName:{
            type:String,
            required:true,
        },
        seen:{
            type:Number,
            required:false,
            default:0,
        },
        chat:{
            type:String,
            required:true,
        }
    },{timestamps:true})
    const Chats=mongoose.model("chats",userChat)
 module.exports= {
    User,
    Chats,
 }
