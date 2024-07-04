const express=require('express');
const fs=require('fs');
const path=require('path');
const bodyParser =require("body-parser");
const {User,Chats}=require('../models/index')
const {Server}=require('socket.io')
const session = require('express-session');
const {checkAuth}=require('../middlewares/authentication')
const multer = require('multer');
const jwt =require('jsonwebtoken')
const cookieParser = require('cookie-parser');
require('dotenv').config();


const router=express.Router();
router.use(express.json());
router.use(cookieParser());


router.use('/uploads', express.static('uploads')); 

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });




const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/home')
  
    jwt.verify(token, process.env.secret_key, (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Invalid Token' });
      req.user = decoded;
      next();
    });
  };


  router.get('/',verifyToken,(req,res)=>{
    if(req.user.username){
        res.redirect('/mycontact')
    }
})

router.get('/home',(req,res)=>{
    router.use(express.static(path.join(__dirname, '../public')));
        
    res.sendFile(path.join(__dirname,'../public','index.html'))
})

router.post("/signup",async(req,res)=>{
    const chname=req.body.Email
    const alldbuser=await User.find({});
    const userde=alldbuser.find(user=>user.Name==chname)
    if(userde){
        return res.render('signup',{alert:'User-Name already Exist'})
    }
    else{
        const result=await User.create({
            Name:chname,
            password:req.body.password
        })
        return res.render('login',{alert:'Try Logging In'})
    }
 })

 router.get('/login',(req,res)=>{
    return res.redirect('/home');
 })

 router.get('/logout',verifyToken,async (req, res) => {
    const userde=req.user.username;
    if(userde.online==1){
       await User.updateOne({ _id: userde._id }, {$set :{online: 0 }});
    }
    res.clearCookie('token', {
        httpOnly: true,
      });
    return res.redirect('/home');
});

router.post("/login",async (req,res)=>{
    const Name=req.body.Email;
    const password=req.body.password;
    const alldbuser=await User.find({});
    const userde=alldbuser.find(user=>user.Name==Name && user.password==password)
    if(!userde){
        return res.render('login',{alert:'Incorrect UserName Or Password'})
    }
    else{
        if(userde.online==undefined ||userde.online==null || userde.online== 0){
            userde.online=1;
            await User.updateOne({ _id: userde._id },{$set: {online: 1 }});
        }

        const token = jwt.sign({username: userde }, process.env.secret_key, {expiresIn: '1h'});
        res.cookie('token', token,{
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 
          });
        return res.redirect('/mycontact') 
    }
 });


router.get('/mycontact',verifyToken,async(req,res)=>{
    router.use(express.static(path.join(__dirname, '../public')));
    const Name=req.user.username.Name;
    const allcontact=await User.find({});
    const Cuser=await allcontact.find(user=>user.Name==Name);
    const dbname=await allcontact.map(user=>user.Name);
    const allchats=await Chats.find({});
    const tonotify=[];
    const userpp=[];
    const useron=[];
    for(i=0;i<Cuser.contacts.length;i++){
        const userchat=await allchats.filter(user=>((user.SenderName==Cuser.contacts[i] && user.ReceiverName==Name && user.seen==0)));
        const contactsWithPp = await User.find({ Name: { $in: Cuser.contacts[i] } }).select('Pp');
        const contactsWithon = await User.find({ Name: { $in: Cuser.contacts[i] } }).select('online');
        userpp[i]=contactsWithPp[0].Pp;
        useron[i]=contactsWithon[0].online;
        tonotify[i]=userchat.length;
    }
    console.log
    return res.render('mycontact',{name:Name,contacts:Cuser.contacts,pic:req.user.username,userpp:userpp,useron:useron,notifyn:tonotify});
})

router.get('/search', async (req, res) => {
    const { query } = req.query;
    try {
        const results = await User.find({ 
            Name: { $regex: query, $options: 'i' }
        });
        res.json(results);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});


router.put('/upload', upload.single('profilePic'), verifyToken,async(req, res) => {
    const { filename, url } = req.body;
    const profilePicPath = `/uploads/${req.file.filename}`;
    const userId=req.user.username._id;
    const user = await User.findByIdAndUpdate(userId, {
        Pp: profilePicPath
    })
})

router.post('/chatArea',async(req,res)=>{
    router.use(express.static(path.join(__dirname, '../public')));
    const user1=req.body.myname;
    const user2=req.body.tname;
    const allchats= await Chats.find({});
    const alldbuser=await User.find({});
    const receiver=alldbuser.find(user=>user.Name==user2)
    const userchat=await allchats.filter(user=>((user.SenderName==user1 && user.ReceiverName==user2) || (user.SenderName==user2 && user.ReceiverName==user1)));
    const filter = {$and: [ { ReceiverName: user1 }, { SenderName: user2 } ]}; 
    const update = { $set: { seen: 1 } };
    await Chats.updateMany(filter,update)
    res.render('chatArea',{name:user1,tname:user2,texts:userchat,pic:receiver.Pp})
})

router.post('/redirect',(req,res)=>{
res.redirect('/mycontact')
})

module.exports= router;