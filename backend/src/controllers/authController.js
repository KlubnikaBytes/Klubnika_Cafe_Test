// backend/src/controllers/authController.js

const User = require('../models/User.js'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../config/mailer.js'); 
const { sendSMS } = require('../utils/smsSender.js'); 
const Product = require('../models/Product.js'); 

/* -------------------------------------------------------------------------- */
/* SIGNUP LOGIC                                */
/* -------------------------------------------------------------------------- */

exports.sendSignupOtp = async (req, res) => {
  const { email, password, name, mobile, verifyMethod } = req.body;

  try {
    const existingVerifiedUser = await User.findOne({ 
      $or: [{ email }, { mobile }],
      isVerified: true 
    });
    
    if (existingVerifiedUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; 
    const hashed = await bcrypt.hash(password, 10);

    await User.findOneAndUpdate(
      { $or: [{ email }, { mobile }] },
      {
        name,
        email,
        mobile,
        password: hashed,
        signupOtp: otp,
        signupOtpExpires: otpExpires,
        isVerified: false,
      },
      { new: true, upsert: true }
    );

    if (verifyMethod === 'email') {
      const subject = 'Your Klubnika Signup OTP';
      const text = `OTP: ${otp}`;
      const html = `<p>OTP: <strong>${otp}</strong></p>`;
      await sendEmail(email, subject, text, html);
      res.status(200).json({ message: `OTP sent to ${email}` });

    } else if (verifyMethod === 'mobile') {
      await sendSMS(mobile, otp);
      res.status(200).json({ message: `OTP sent to ${mobile}` });
    } else {
      res.status(400).json({ error: 'Invalid verification method' });
    }

  } catch (error) {
    console.error(error);
    if (error.code === 11000) return res.status(400).json({ error: 'Email/Mobile already used' });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.verifySignup = async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Attempt to find user by email first, or handle mobile logic if needed
    // For this fix, we assume the user passes email or we find by the OTP if unique
    // To keep it simple and robust for now:
    const user = await User.findOne({ email }); // OR logic can be added if needed

    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User already verified' });
    if (user.signupOtp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > new Date(user.signupOtpExpires)) return res.status(400).json({ error: 'OTP expired' });

    user.isVerified = true;
    user.signupOtp = null;
    user.signupOtpExpires = null;
    await user.save();
    
    res.status(201).json({ message: 'Signup done' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

/* -------------------------------------------------------------------------- */
/* LOGIN LOGIC                                 */
/* -------------------------------------------------------------------------- */

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (!user.isVerified) return res.status(403).json({ error: 'Account not verified' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      token, 
      user: { _id: user._id, email: user.email, name: user.name, mobile: user.mobile } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// --- THIS IS THE MISSING PART causing your error ---
exports.sendLoginOtp = async (req, res) => {
  const { mobile } = req.body;
  try {
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ error: 'Mobile not registered' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.signupOtp = otp; 
    user.signupOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendSMS(mobile, otp);
    res.status(200).json({ message: `OTP sent to ${mobile}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// --- THIS IS ALSO NEEDED ---
exports.loginWithOtp = async (req, res) => {
  const { mobile, otp } = req.body;
  try {
    const user = await User.findOne({ mobile });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.signupOtp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > new Date(user.signupOtpExpires)) return res.status(400).json({ error: 'OTP expired' });

    user.signupOtp = null;
    user.signupOtpExpires = null;
    user.isVerified = true; 
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      token, 
      user: { _id: user._id, email: user.email, name: user.name, mobile: user.mobile } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteAllData = async (req, res) => {
  try {
    if (req.query.secret !== 'klubnika-dev-only') return res.status(403).json({ error: 'Invalid secret' });
    await User.deleteMany({});
    await Product.deleteMany({});
    res.status(200).json({ message: 'All data deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};