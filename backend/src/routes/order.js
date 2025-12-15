// backend/src/routes/order.js
const express = require("express");
const router = express.Router();

const {
  getAllOrders,
  getMyOrders,
  updateOrderStatus,
  downloadInvoice,
} = require("../controllers/orderController.js");

const {
  authenticateToken,
  authenticateAdmin,
} = require("../middlewares/authMiddleware.js");

// User routes
router.get("/", authenticateAdmin, getAllOrders);
router.get("/my-orders", authenticateToken, getMyOrders);

// Public Invoice Route (for SMS Links & Direct Downloads)
// No auth needed—anyone with the order ID can download (adjust if needed)
router.get("/:id/invoice", downloadInvoice);

// Admin route
router.put("/:id/status", authenticateAdmin, updateOrderStatus);

module.exports = router;
