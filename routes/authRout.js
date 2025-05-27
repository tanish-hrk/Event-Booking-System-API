const express = require('express')
const { body } = require('express-validator')
const AuthCtrl = require('../controllers/authCtrl')
const authMid = require('../middlewares/authMid')
const { requireAdmin, requireUser, rateLimitByRole } = require('../middlewares/roleMid')
const { authValidators } = require('../middlewares/validators')

const AuthRout = express.Router()

AuthRout.post('/register', [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('Only letters and spaces allowed'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('Only letters and spaces allowed'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Too long'),

  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6-128 chars')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Needs uppercase, lowercase and number'),

  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Invalid role')
], AuthCtrl.register)


AuthRout.post('/login', [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password required')
    .isLength({ min: 1 })
    .withMessage('Password too short')
], AuthCtrl.login)


AuthRout.get('/profile', authMid, AuthCtrl.getProfile)


AuthRout.put('/profile', [
  authMid,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name invalid')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('Only letters and spaces'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name invalid')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('Only letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email')
    .normalizeEmail()
], AuthCtrl.updateProfile)


AuthRout.post('/change-password', [
  authMid,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password needed'),

  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password invalid')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Must include upper, lower, number'),

  body('confirmPassword')
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) {
        throw new Error('Does not match new password')
      }
      return true
    })
], AuthCtrl.changePassword)


AuthRout.post('/logout', authMid, AuthCtrl.logout)


AuthRout.get('/verify-token', authMid, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token OK',
    data: {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  })
})


module.exports = AuthRout
