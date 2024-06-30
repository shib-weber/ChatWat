const express=require('express');
const fs=require('fs');
const path=require('path');
const bodyParser =require("body-parser");
const {User,Chats}=require('../models/index')
const {Server}=require('socket.io')
const session = require('express-session');
const {checkAuth}=require('../middlewares/authentication')
const multer = require('multer');


const router=express.Router();
router.use(express.json());
router.use(express.static(path.join(__dirname, '../public')));


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


router.use(session({
    secret: 'Yes_You_Are_Mine25',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
}));

router.get('/',(req,res)=>{
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
    return res.redirect('/');
 })

router.get('/logout',checkAuth,async (req, res) => {
    const userde=req.session.user;
    if(userde.online==1){
       await User.updateOne({ _id: userde._id }, {$set :{online: 0 }});
    }
    req.session.destroy(err => {
        if (err) {
            return res.send('Error logging out');
        }
        
    });
    return res.redirect('/');
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
        req.session.user=userde;
        const allcontact=await User.find({});
        return res.redirect('/mycontact')
    }
 });


router.get('/mycontact',checkAuth,async(req,res)=>{
    const Name=req.session.user.Name;
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
    return res.render('mycontact',{name:Name,contacts:Cuser.contacts,pic:req.session.user,userpp:userpp,useron:useron,notifyn:tonotify});
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


router.put('/upload', upload.single('profilePic'), checkAuth,async(req, res) => {
    const { filename, url } = req.body;
    const profilePicPath = `/uploads/${req.file.filename}`;
    const userId=req.session.user._id;
    const user = await User.findByIdAndUpdate(userId, {
        Pp: profilePicPath
    })
})

router.post('/chatArea',async(req,res)=>{
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