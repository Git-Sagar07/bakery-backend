const express   = require("express");
const crypto    = require("crypto");
const Razorpay  = require("razorpay");
const router    = express.Router();
const User      = require("../models/User");
const Order     = require("../models/Order");
const { protect } = require("../middleware/auth");
const { PRODUCTS } = require("./products");
const { sendOrderConfirmationEmail } = require("./email");

const DELIVERY_CHARGE   = 49;
const FREE_DELIVERY_MIN = 499;
const GST_RATE          = 0.05;
const VALID_COUPONS     = { SWEET10: 10, BAKERY20: 20, FIRST15: 15 };

// Razorpay instance (lazy — created on first use so missing keys don't crash startup)
let razorpay;
function getRazorpay() {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars.");
    }
    razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

// ── POST /api/payment/create-order ───────────────────────────
// Creates a Razorpay order from the user's current cart.
// Returns { razorpayOrderId, amount, currency, keyId, orderSummary }
router.post("/create-order", protect, async (req, res) => {
  try {
    const { couponCode } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (!user.cart || user.cart.length === 0)
      return res.status(400).json({ success: false, message: "Your cart is empty." });

    // Build items
    const items = user.cart
      .map(ci => {
        const p = PRODUCTS.find(x => x.id === ci.productId);
        if (!p) return null;
        return { id: p.id, name: p.name, price: p.price, unit: p.unit, image: p.image, quantity: ci.quantity };
      })
      .filter(Boolean);

    if (items.length === 0)
      return res.status(400).json({ success: false, message: "No valid items in cart." });

    // Totals
    const subtotal    = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const delivery    = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_CHARGE;
    const gst         = Math.round(subtotal * GST_RATE);
    const code        = couponCode ? couponCode.toString().trim().toUpperCase() : null;
    const discount    = code && VALID_COUPONS[code] ? Math.round(subtotal * VALID_COUPONS[code] / 100) : 0;
    const grand_total = subtotal + delivery + gst - discount;

    // Create Razorpay order (amount in paise)
    const rpOrder = await getRazorpay().orders.create({
      amount:   grand_total * 100,
      currency: "INR",
      receipt:  `bakery_${Date.now()}`,
      notes:    { userId: req.user._id.toString(), couponCode: code || "" },
    });

    return res.json({
      success:        true,
      razorpayOrderId: rpOrder.id,
      amount:          grand_total * 100,
      currency:        "INR",
      keyId:           process.env.RAZORPAY_KEY_ID,
      orderSummary: {
        items, subtotal, delivery, gst, discount, grand_total, couponCode: code,
        address: user.address || {},
        userName: user.name,
        userEmail: user.email,
      },
    });
  } catch (err) {
    console.error("POST /payment/create-order error:", err);
    return res.status(500).json({ success: false, message: err.message || "Could not initiate payment." });
  }
});

// ── POST /api/payment/verify ──────────────────────────────────
// Called after successful Razorpay payment.
// Verifies signature, creates DB order, clears cart, sends email.
router.post("/verify", protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      couponCode,
    } = req.body;

    // 1. Verify signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed. Please contact support." });
    }

    // 2. Build order from cart
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const items = user.cart
      .map(ci => {
        const p = PRODUCTS.find(x => x.id === ci.productId);
        if (!p) return null;
        return { id: p.id, name: p.name, price: p.price, unit: p.unit, image: p.image, quantity: ci.quantity };
      })
      .filter(Boolean);

    const subtotal    = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const delivery    = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_CHARGE;
    const gst         = Math.round(subtotal * GST_RATE);
    const code        = couponCode ? couponCode.toString().trim().toUpperCase() : null;
    const discount    = code && VALID_COUPONS[code] ? Math.round(subtotal * VALID_COUPONS[code] / 100) : 0;
    const grand_total = subtotal + delivery + gst - discount;

    // 3. Save order
    const order = await Order.create({
      userId:           user._id,
      items,
      address:          user.address || {},
      subtotal,
      delivery,
      gst,
      discount,
      grand_total,
      couponCode:       code,
      status:           "Confirmed",
      placed_at:        new Date(),
      paymentId:        razorpay_payment_id,
      razorpayOrderId:  razorpay_order_id,
    });

    // 4. Clear cart
    user.cart = [];
    await user.save();

    // 5. Send confirmation email (non-blocking — don't fail the order if email fails)
    sendOrderConfirmationEmail({
      toEmail:  user.email,
      userName: user.name,
      orderId:  `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
      items,
      subtotal,
      delivery,
      gst,
      discount,
      grand_total,
      address:  user.address || {},
    }).catch(err => console.error("Email send error:", err));

    const formattedId = `ORD-${order._id.toString().slice(-6).toUpperCase()}`;
    return res.json({
      success: true,
      message: "Payment successful! Order confirmed.",
      orderId: formattedId,
      order: {
        id:          formattedId,
        _id:         order._id,
        items,
        grand_total,
        status:      "Confirmed",
        placed_at:   order.placed_at,
      },
    });
  } catch (err) {
    console.error("POST /payment/verify error:", err);
    return res.status(500).json({ success: false, message: "Could not confirm order." });
  }
});

module.exports = router;
