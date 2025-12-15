// backend/src/controllers/orderController.js
const Order = require("../models/Order.js");
const PDFDocument = require("pdfkit");
const { sendEmail } = require("../config/mailer.js");
const {
  sendUpdateSMS,
  sendDeliveredSMS,
} = require("../utils/smsSender.js");

// Helper: generate invoice PDF into a Buffer (for email attachment & downloads)
const generateInvoicePdfBuffer = (order) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on("error", (err) => reject(err));

      // --- PDF CONTENT ---
      doc.fontSize(20).text("KLUBNIKA - INVOICE", { align: "center" });
      doc.moveDown();

      doc.fontSize(10).text("Klubnika Restaurant", { align: "right" });
      doc.text("123 Food Street, Kolkata", { align: "right" });
      doc.moveDown();

      doc.fontSize(12).text(`Order ID: ${order._id}`);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
      doc.text(`Customer: ${order.user.name}`);
      doc.text(`Mobile: ${order.user.mobile}`);
      doc.moveDown();
      doc.text(`Delivery Address: ${order.deliveryAddress}`);
      doc.moveDown();

      // Table Header
      doc.fontSize(12).font("Helvetica-Bold");
      doc.text("Item", 50, 250);
      doc.text("Qty", 300, 250);
      doc.text("Price", 400, 250, { align: "right" });
      doc.moveTo(50, 265).lineTo(550, 265).stroke();

      // Table Rows
      let y = 280;
      doc.font("Helvetica").fontSize(12);

      order.items.forEach((item) => {
        const title =
          item.title && item.title.length > 35
            ? item.title.substring(0, 35) + "..."
            : item.title;
        doc.text(title || "", 50, y);
        doc.text(item.quantity?.toString() || "1", 300, y);
        doc.text(item.price?.toString() || "0", 400, y, { align: "right" });
        y += 20;
      });

      doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();

      // Total
      doc.fontSize(14).font("Helvetica-Bold");
      doc.text(`Total Paid: Rs. ${order.totalAmount}`, 50, y + 30, {
        align: "right",
      });

      // Footer
      doc.fontSize(10).font("Helvetica");
      doc.text("Thank you for dining with us!", 50, 700, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

// @desc    Get all orders (Admin) OR Download Invoice (via Query Param)
exports.getAllOrders = async (req, res) => {
  // 1. Handle Invoice Download Request (e.g. if accessed via browser)
  // URL: /api/orders?order_id=...&type=invoice
  if (req.query.type === 'invoice' && req.query.order_id) {
    try {
      const order = await Order.findById(req.query.order_id).populate(
        "user",
        "name email mobile"
      );
      
      if (!order) {
        return res.status(404).send("Order not found or Invalid Link");
      }

      const pdfBuffer = await generateInvoicePdfBuffer(order);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${order._id}.pdf`
      );
      return res.send(pdfBuffer);
    } catch (err) {
      console.error("Invoice Gen Error:", err);
      return res.status(500).send("Error generating invoice");
    }
  }

  // 2. Standard Admin Behavior: Get All Orders
  try {
    const orders = await Order.find({})
      .populate("user", "name email mobile")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

// @desc    Get my orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

// @desc    Update status (Admin) & Send Notifications
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const io = req.io;

  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email mobile"
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    await order.save();

    // Re-populate (if necessary)
    await order.populate("user", "name email mobile");

    // Socket events
    io.to(order.user._id.toString()).emit("orderStatusUpdate", order);
    io.to("admins").emit("orderStatusUpdate", order);

    const shortOrderId = order._id.toString().slice(-6).toUpperCase();

    // Production Links for SMS (EXACT WHITELISTED MATCH)
    const trackingLink = "https://www.klubnikacafe.com/my-orders";
    const ratingsLink = "https://www.klubnikacafe.com/ratings";

    if (status === "Delivered") {
      // SMS DELIVERED
      sendDeliveredSMS(order.user.mobile, shortOrderId, ratingsLink).catch((err) =>
        console.error("Delivered SMS Error:", err.message)
      );

      // EMAIL DELIVERED
      const deliveredHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #10b981; padding: 30px; text-align: center; color: white;">
            <h1>Order Delivered!</h1>
            <p>Bon Appétit!</p>
          </div>
          <div style="padding: 30px;">
            <p>Hi ${order.user.name},</p>
            <p>Your order <strong>#${shortOrderId}</strong> has been successfully delivered.</p>
            <p>We hope you enjoy your meal. We would love to hear your feedback!</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://bit.ly/klubnika-rate" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Rate Us on Google</a>
            </div>
          </div>
        </div>
      `;

      sendEmail(
        order.user.email,
        `Order Delivered! #${shortOrderId}`,
        "Your order has been delivered.",
        deliveredHtml
      ).catch((err) => console.error("Delivered Email Error:", err.message));

    } else if (status !== "Pending") {
      // Status update SMS
      // This sends to sendUpdateSMS, which uses the trackingLink variable
      sendUpdateSMS(order.user.mobile, shortOrderId, status, trackingLink).catch(
        (err) => console.error("Update SMS Error:", err.message)
      );

      // EMAIL UPDATE
      const updateHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #f43f5e; padding: 20px; text-align: center; color: white;">
            <h2>Order Status Update</h2>
          </div>
          <div style="padding: 30px;">
            <p>Hi ${order.user.name},</p>
            <p>Your order <strong>#${shortOrderId}</strong> is currently:</p>
            <h2 style="color: #f43f5e; text-align: center; margin: 20px 0;">${status}</h2>
            <p style="text-align: center;">
               <a href="${trackingLink}" style="color: #f43f5e; font-weight: bold;">Track your order here</a>
            </p>
          </div>
        </div>
      `;

      sendEmail(
        order.user.email,
        `Order Update: ${status} #${shortOrderId}`,
        `Order status: ${status}`,
        updateHtml
      ).catch((err) => console.error("Update Email Error:", err.message));
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

// @desc    Generate and Download PDF Invoice
exports.downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email mobile"
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const pdfBuffer = await generateInvoicePdfBuffer(order);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order._id}.pdf`
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generating invoice" });
  }
};

// Export helper for use in paymentController
exports.generateInvoicePdfBuffer = generateInvoicePdfBuffer;