const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const { User } = require('../models')

class AuthCtrl {

  static async signup(req,res){
      const errs = validationResult(req)
      if(!errs.isEmpty()){
          return res.status(400).json({
              success:false,
              message:'Validation failed',
              errors: errs.array()
          })
      }
      const {first,last,email,password,role='user'} = req.body

      const existing = await User.findOne({ where: { email: email.toLowerCase() } })
      if(existing){
        return res.status(409).json({
            success:false,
            message:'User with this email already exists'
        })
      }
      const rounds=12
      const pwdHash=await bcrypt.hash(password,rounds)

      const newUser = await User.create({
        firstName:first,
        lastName:last,
        email:email.toLowerCase(),
        password: pwdHash,
        role: role==='admin'?'admin':'user'
      })

      const token= jwt.sign({
        userId:newUser.id,
        email:newUser.email,
        role:newUser.role
      }, process.env.JWT_SECRET,{
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer:'event-booking-api'
      })

      const userResp={
        id:newUser.id,
        firstName:newUser.firstName,
        lastName:newUser.lastName,
        email:newUser.email,
        role:newUser.role,
        createdAt:newUser.createdAt
      }
      res.status(201).json({
        success:true,
        message:'User registered successfully',
        data:{
          user:userResp,
          token,
          tokenType:'Bearer'
        }
      })
  }

  static async signin(req,res){
    const errs=validationResult(req)
    if(!errs.isEmpty()){
      return res.status(400).json({
        success:false,
        message:'Validation failed',
        errors: errs.array()
      })
    }
    const {email,password}=req.body
    const user= await User.findOne({ where:{email:email.toLowerCase()} })
    if(!user){
      return res.status(401).json({
        success:false,
        message:'Invalid email or password'
      })
    }
    const validPwd= await bcrypt.compare(password,user.password)
    if(!validPwd){
      return res.status(401).json({
        success:false,
        message:'Invalid email or password'
      })
    }

    const token= jwt.sign({
      userId:user.id,
      email:user.email,
      role:user.role
    }, process.env.JWT_SECRET,{
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer:'event-booking-api'
    })

    await user.update({lastLoginAt:new Date()})

    const userResp={
      id:user.id,
      firstName:user.firstName,
      lastName:user.lastName,
      email:user.email,
      role:user.role,
      lastLoginAt:user.lastLoginAt
    }
    res.status(200).json({
      success:true,
      message:'Login successful',
      data:{
        user:userResp,
        token,
        tokenType:'Bearer'
      }
    })
  }

  static async profile(req,res){
    const uid= req.user.userId
    const user=await User.findByPk(uid,{attributes:{exclude:['password']}})
    if(!user){
      return res.status(404).json({
        success:false,
        message:'User not found'
      })
    }
    res.status(200).json({
      success:true,
      message:'Profile retrieved successfully',
      data:{user}
    })
  }

  static logout(req,res){
    res.status(200).json({
      success:true,
      message:'Logout successful. Please remove the token from client storage.'
    })
  }

  static async refresh(req,res){
    const uid= req.user.userId
    const user= await User.findByPk(uid)
    if(!user){
      return res.status(404).json({
        success:false,
        message:'User not found'
      })
    }
    const newTok= jwt.sign({
      userId:user.id,
      email:user.email,
      role:user.role
    }, process.env.JWT_SECRET,{
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer:'event-booking-api'
    })

    res.status(200).json({
      success:true,
      message:'Token refreshed successfully',
      data:{
        token:newTok,
        tokenType:'Bearer'
      }
    })
  }

  static async updateProfile(req, res) {
    const errs = validationResult(req)
    if (!errs.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errs.array()
      })
    }

    const uid = req.user.userId
    const updates = req.body

    const user = await User.findByPk(uid)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    if (updates.email && updates.email !== user.email) {
      const existing = await User.findOne({ where: { email: updates.email.toLowerCase() } })
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        })
      }
    }

    await user.update(updates)

    const updatedUser = await User.findByPk(uid, {
      attributes: { exclude: ['password'] }
    })

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    })
  }

  static async changePassword(req, res) {
    const errs = validationResult(req)
    if (!errs.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errs.array()
      })
    }

    const uid = req.user.userId
    const { currentPassword, newPassword } = req.body

    const user = await User.findByPk(uid)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const validPwd = await bcrypt.compare(currentPassword, user.password)
    if (!validPwd) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    const rounds = 12
    const pwdHash = await bcrypt.hash(newPassword, rounds)
    await user.update({ password: pwdHash })

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    })
  }
}

module.exports = AuthCtrl
