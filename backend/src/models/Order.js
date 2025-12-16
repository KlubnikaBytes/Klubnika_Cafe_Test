// backend/src/models/Order.js
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: String, required: true },
  image: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },
  
  // --- NEW: Order Type (Delivery vs Dine-in) ---
  orderType: {
    type: String,
    enum: ['Delivery', 'Dine-in'],
    default: 'Delivery'
  },
  
  // --- NEW: Table Number (Only for Dine-in) ---
  tableNumber: {
    type: String,
    // Optional: Only strictly needed if orderType is Dine-in
  },

  // --- UPDATED: Delivery Fields are now OPTIONAL ---
  // (Because Dine-in orders won't have an address)
  deliveryAddress: {
    type: String,
    required: false, 
  },
  deliveryCoords: {
    lat: { type: Number, required: false },
    lng: { type: Number, required: false },
  },

  // --- UPDATED: Payment Fields are now OPTIONAL ---
  // (Because Cash orders won't have Razorpay IDs)
  paymentId: {
    type: String,
    required: false, 
  },
  razorpayOrderId: {
    type: String,
    required: false, 
  },
  paymentMethod: {
    type: String,
    default: 'Online', // Changed default to 'Online', but can be 'Cash'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
