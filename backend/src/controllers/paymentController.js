// backend/src/controllers/paymentController.js
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Product = require("../models/Product.js");
const User = require("../models/User.js");
const Order = require("../models/Order.js");
const { sendEmail } = require("../config/mailer.js");
const { sendBillSMS } = require("../utils/smsSender.js");
const { generateInvoicePdfBuffer } = require("./orderController.js");

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper: Normalize titles
const getCleanItemTitle = (title) => {
  if (title && title.startsWith("Extra Cheese (")) {
    return "Extra Cheese";
  }
  return title;
};

// Helper: Parse price
const parsePrice = (priceStr) => {
  if (typeof priceStr === "number") return priceStr;
  if (!priceStr) return 0;
  return parseFloat(priceStr.toString().replace(/[^0-9.]/g, ""));
};

// @desc    1. Create Razorpay Order ID (For Online Payment)
exports.createOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const cartItems = user.cart;
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    // Check Stock
    const uniqueTitles = [...new Set(cartItems.map((item) => getCleanItemTitle(item.title)))];
    const products = await Product.find({ name: { $in: uniqueTitles } });
    const stockMap = new Map();
    products.forEach((p) => stockMap.set(p.name, p.isInStock));

    const unavailableItems = [];
    for (const item of cartItems) {
      const checkTitle = getCleanItemTitle(item.title);
      if (stockMap.has(checkTitle) && !stockMap.get(checkTitle)) {
        unavailableItems.push(item.title);
      }
    }

    if (unavailableItems.length > 0) {
      return res.status(400).json({ error: `Items sold out: ${unavailableItems.join(", ")}` });
    }

    // Calculate Total
    const calculatedTotal = cartItems.reduce((acc, item) => {
      const priceValue = parsePrice(item.price);
      return acc + priceValue * item.quantity;
    }, 0);

    if (isNaN(calculatedTotal) || calculatedTotal <= 0) {
      return res.status(400).json({ error: "Invalid total amount calculated." });
    }

    const options = {
      amount: Math.round(calculatedTotal * 100),
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    const order = await instance.orders.create(options);
    if (!order) return res.status(500).send("Error creating order");

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    2. Verify Razorpay Payment (Online) & Create Order
exports.verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    deliveryAddress,
    deliveryCoords,
    orderType,   // Optional: 'Delivery' or 'Dine-in'
    tableNumber  // Optional: If Dine-in
  } = req.body;

  const secret = process.env.RAZORPAY_KEY_SECRET;
  const io = req.io;

  // 1. Verify Signature
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = shasum.digest("hex");

  if (digest !== razorpay_signature) {
    return res.status(400).json({ success: false, message: "Invalid signature." });
  }

  try {
    // 2. Fetch Payment Details from Razorpay
    const paymentDetails = await instance.payments.fetch(razorpay_payment_id);
    if (paymentDetails.status !== "captured") {
      return res.status(400).json({ success: false, message: "Payment not captured" });
    }

    // Determine Method string
    let payMethod = paymentDetails.method;
    if (payMethod === "wallet") payMethod = `Wallet (${paymentDetails.wallet})`;
    if (payMethod === "emi") payMethod = "Pay Later / EMI";
    if (payMethod === "card") payMethod = `${paymentDetails.card.network} Card`;
    if (payMethod === "upi") payMethod = `UPI (${paymentDetails.vpa})`;

    const user = await User.findById(req.user.id);
    const validCartItems = user.cart;
    const amountPaid = paymentDetails.amount / 100;

    // 3. Create Order in DB
    const newOrder = new Order({
      user: user._id,
      items: validCartItems,
      totalAmount: amountPaid,
      status: "Pending",
      
      // Handle Order Type (Default to Delivery if not specified)
      orderType: orderType || 'Delivery',
      tableNumber: (orderType === 'Dine-in') ? tableNumber : undefined,
      
      deliveryAddress: deliveryAddress,
      deliveryCoords: deliveryCoords,
      
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      paymentMethod: payMethod,
    });

    await newOrder.save();
    
    // Clear Cart
    user.cart = [];
    await user.save();
    
    // Populate for Email/Socket
    await newOrder.populate("user", "name email mobile");

    // --- NOTIFICATIONS ---
    
    // 1. Socket to Admin
    if (io) io.to("admins").emit("newOrder", newOrder);

    // 2. SMS Logic
    const shortOrderId = newOrder._id.toString().slice(-6).toUpperCase();
    const invoiceLink = "https://www.klubnikacafe.com/api/orders"; // Keep exact whitelist URL

    sendBillSMS(user.mobile, amountPaid, shortOrderId, invoiceLink).catch(
      (err) => console.error("SMS Failed:", err.message)
    );

    // 3. Email Logic (with PDF)
    const emailSubject = `Total Amount Paid #${shortOrderId}`;
    const itemsHtml = validCartItems
      .map(
        (item) => `
      <tr>
        <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.title}</td>
        <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${item.quantity}</td>
        <td style="padding: 15px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151; font-weight: 600;">₹${item.price}</td>
      </tr>`
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #ffffff;">
        <div style="max-width: 600px; margin: 20px auto; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
          <div style="background-color: #f43f5e; padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Confirmed!</h1>
            <p style="color: #ffe4e6; margin: 10px 0 0 0;">Thanks for dining with Klubnika</p>
          </div>
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #374151;">Hi <strong>${user.name}</strong>,</p>
            <p style="color: #6b7280;">We've received your order.</p>
            
            <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #f3f4f6;">
              <p style="margin: 0; color: #4b5563;"><strong>Order ID:</strong> #${shortOrderId}</p>
              <p style="margin: 5px 0 0 0; color: #4b5563;"><strong>Transaction ID:</strong> ${razorpay_payment_id}</p>
              ${orderType === 'Dine-in' ? `<p style="margin: 5px 0 0 0; color: #7c3aed;"><strong>Table:</strong> ${tableNumber}</p>` : ''}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr>
                  <th style="text-align: left; color: #9ca3af; font-size: 12px; padding-bottom: 10px;">ITEM</th>
                  <th style="text-align: center; color: #9ca3af; font-size: 12px; padding-bottom: 10px;">QTY</th>
                  <th style="text-align: right; color: #9ca3af; font-size: 12px; padding-bottom: 10px;">PRICE</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            
            <div style="border-top: 2px solid #e5e7eb; padding-top: 15px; text-align: right;">
              <span style="font-weight: 700; color: #374151; margin-right: 20px;">Total Amount</span>
              <span style="font-weight: 800; font-size: 24px; color: #f43f5e;">₹${amountPaid}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePdfBuffer(newOrder);

    // Send Email
    await sendEmail(
      user.email,
      emailSubject,
      `Your order for ₹${amountPaid} is confirmed.`,
      emailHtml,
      [
        {
          filename: `invoice-${newOrder._id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    );

    res.json({
      success: true,
      message: "Order created successfully",
      orderId: newOrder._id,
    });
  } catch (err) {
    console.error("Verify Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    3. Create Cash/Dine-in Order (In-House / Pay at Counter)
// @route   POST /api/payment/create-cash-order
exports.createCashOrder = async (req, res) => {
  const { orderType, tableNumber, deliveryAddress, deliveryCoords } = req.body;
  const io = req.io;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const cartItems = user.cart;
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    // Calculate Total
    const totalAmount = cartItems.reduce((acc, item) => {
      const priceValue = parsePrice(item.price);
      return acc + priceValue * item.quantity;
    }, 0);

    // Create Order Directly (Skip Razorpay)
    const newOrder = new Order({
      user: user._id,
      items: cartItems,
      totalAmount: totalAmount,
      status: "Pending",
      paymentMethod: "Cash / Pay at Counter",
      
      // Order Type Logic
      orderType: orderType || 'Delivery', 
      
      // Conditional Fields
      tableNumber: orderType === 'Dine-in' ? tableNumber : undefined,
      deliveryAddress: orderType === 'Delivery' ? deliveryAddress : undefined,
      deliveryCoords: orderType === 'Delivery' ? deliveryCoords : undefined,
    });

    await newOrder.save();

    // Clear Cart
    user.cart = [];
    await user.save();
    
    // Notify Admin via Socket
    const populatedOrder = await newOrder.populate("user", "name email mobile");
    if (io) io.to("admins").emit("newOrder", populatedOrder);

    // NOTE: We usually skip the detailed PDF email for "Pay at Counter" until they actually pay.
    // However, you can send a "Order Received" email here if you like.

    res.json({ success: true, orderId: newOrder._id, message: "Order placed successfully!" });

  } catch (err) {
    console.error("Cash Order Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};
