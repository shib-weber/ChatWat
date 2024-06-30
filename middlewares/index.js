const express=require('express')

const app=express();
function logreqres(){return(req,res,next)=>{
    req.name=req.body.Email;
    next();
}}


module.exports={
    logreqres,
}