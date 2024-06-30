const http=require('http');
const express=require("express")
const {Server}=require('socket.io')
const bodyParser =require("body-parser")
const fs= require("fs");
const path = require("path");
const userRouter=require('./router/user')
const mongoose=require('mongoose')
const {logreqres}=require('./middlewares/index');
const { type } = require("os");
const {User,Chats}=require('./models/index')
require('dotenv').config();


const PORT= process.env.PORT || 8000;
const app=express();
const server=http.createServer(app);
const io=new Server(server);


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended:false}))
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
app.use(express.json())
app.use(logreqres());


const MongoURI= process.env.MONGODB_URI;

mongoose.connect(MongoURI, {
    useNewUrlParser: false,
    useUnifiedTopology: false,
  }).then(console.log("database connected"))

app.set('view engine','ejs')
app.set('views',path.resolve('./views'))


io.on('connection',(socket)=>{
    socket.on('user-message',async({txtmsg,name,receiver})=>{
        const alldbuser=await User.find({});
        const userS=await alldbuser.find(user=>user.Name==name)
        const userR=await alldbuser.find(user=>user.Name==receiver)
        await User.updateOne(
            { _id: userS._id}, 
            { $pull: { contacts: receiver } } 
        );
        await User.updateOne(
            { _id: userR._id}, 
            { $pull: { contacts: name } } 
        );
        await User.updateOne(
            { _id: userS._id },
            { $push: { contacts:  { $each: [receiver], $position: 0 } } },
        )
        await User.updateOne(
            { _id: userR._id },
            { $push: { contacts:  { $each: [name], $position: 0 }} }
        )
        await Chats.create({
            SenderName:name,
            ReceiverName:receiver,
            chat:txtmsg,
        })
         io.emit('user-message',{txtmsg,name,receiver})
    })
})

app.use(userRouter);

server.listen(PORT,()=>{
    console.log("server running at ",PORT)
})
