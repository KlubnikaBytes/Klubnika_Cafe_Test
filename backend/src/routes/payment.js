const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const router = express.Router();

// Protected: Only logged-in users can create an order
router.post('/create-order', authenticateToken, createOrder);

// Protected: Only logged-in users can verify a payment
router.post('/verify-payment', authenticateToken, verifyPayment);

module.exports = router;