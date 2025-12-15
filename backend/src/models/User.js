// backend/src/models/User.js

const mongoose = require('mongoose');

// --- NEW: Define the cart item sub-schema ---
const cartItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  price: {
    type: String, // Keep as String to match your frontend logic
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
}, { _id: false }); // _id: false stops Mongoose from adding an _id to sub-documents


const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  mobile: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String 
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  signupOtp: {
    type: String,
    default: null
  },
  signupOtpExpires: {
    type: Date,
    default: null
  },
  // --- NEW: Add the cart array ---
  cart: {
    type: [cartItemSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);