const express = require('express');
const {
  sendSignupOtp,
  verifySignup,
  login,
  sendLoginOtp, // <--- New
  loginWithOtp, // <--- New
  deleteAllData,
} = require('../controllers/authController');
const router = express.Router();

// Signup flow
router.post('/send-signup-otp', sendSignupOtp);
router.post('/verify-signup', verifySignup);

// Login flows
router.post('/login', login);
router.post('/send-login-otp', sendLoginOtp); // <--- New Route
router.post('/login-with-otp', loginWithOtp); // <--- New Route

// Dev-only
router.delete('/delete-all-data', deleteAllData);

module.exports = router;