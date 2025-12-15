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
  deliveryAddress: {
    type: String,
    required: true,
  },
  deliveryCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  paymentId: {
    type: String,
    required: true,
  },
  razorpayOrderId: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    default: 'Unknown', 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);