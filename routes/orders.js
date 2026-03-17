const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const Order   = require("../models/Order");
const { protect } = require("../middleware/auth");
const { PRODUCTS } = require("./products");

const DELIVERY_CHARGE   = 49;
const FREE_DELIVERY_MIN = 499;
const GST_RATE          = 0.05;
const VALID_COUPONS     = { SWEET10: 10, BAKERY20: 20, FIRST15: 15 };

// Format order for frontend
const formatOrder = (order) => ({
  id:          `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
  _id:         order._id,
  items:       order.items,
  address:     order.address,
  subtotal:    order.subtotal,
  delivery:    order.delivery,
  gst:         order.gst,
  discount:    order.discount,
  grand_total: order.grand_total,
  couponCode:    order.couponCode,
  status:        order.status,
  placed_at:     order.placed_at,
  deliverySlot:  order.deliverySlot || "ASAP",
  statusHistory: order.statusHistory || [],
});

// ── GET /api/orders?status=active|history ─────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { status } = req.query;
    const ACTIVE_STATUSES  = ["Confirmed", "Pending", "Out for Delivery"];
    const HISTORY_STATUSES = ["Delivered", "Cancelled", "Completed"];

    let filter = { userId: req.user._id };
    if (status === "active")  filter.status = { $in: ACTIVE_STATUSES };
    if (status === "history") filter.status = { $in: HISTORY_STATUSES };

    const orders = await Order.find(filter).sort({ placed_at: -1 });
    return res.json({ success: true, orders: orders.map(formatOrder) });
  } catch (err) {
    console.error("GET /orders error:", err);
    return res.status(500).json({ success: false, message: "Could not load orders." });
  }
});

// ── POST /api/orders  { couponCode? } ────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { couponCode, deliverySlot } = req.body;

    // Get user and their cart — guard against deleted accounts
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }
    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty." });
    }

    // Build order items from cart
    const items = user.cart
      .map(cartItem => {
        const product = PRODUCTS.find(p => p.id === cartItem.productId);
        if (!product) return null;
        return {
          id:       product.id,
          name:     product.name,
          price:    product.price,
          unit:     product.unit,
          image:    product.image,
          quantity: cartItem.quantity,
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: "No valid items in cart." });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const delivery = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_CHARGE;
    const gst      = Math.round(subtotal * GST_RATE);
    let   discount = 0;
    const code     = couponCode ? couponCode.toString().trim().toUpperCase() : null;
    if (code) {
      if (VALID_COUPONS[code]) {
        discount = Math.round(subtotal * VALID_COUPONS[code] / 100);
      } else {
        // Invalid coupon — don't block the order, just ignore it
        console.warn(`Invalid coupon attempted: "${code}" by user ${req.user._id}`);
      }
    }
    const grand_total = subtotal + delivery + gst - discount;

    // Create order
    const order = await Order.create({
      userId:     user._id,
      items,
      address:    user.address || {},
      subtotal,
      delivery,
      gst,
      discount,
      grand_total,
      couponCode:    code,
      status:        "Confirmed",
      placed_at:     new Date(),
      deliverySlot:  deliverySlot || "ASAP",
      statusHistory: [{ status: "Confirmed", at: new Date() }],
    });

    // Clear cart
    user.cart = [];
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      orderId: formatOrder(order).id,
      order:   formatOrder(order),
    });
  } catch (err) {
    console.error("Place order error:", err);
    return res.status(500).json({ success: false, message: "Could not place order. Please try again." });
  }
});

// ── PATCH /api/orders/:orderId/cancel ────────────────────────
router.patch("/:orderId/cancel", protect, async (req, res) => {
  try {
    // Guard against malformed IDs crashing findOne
    const { orderId } = req.params;
    if (!orderId || orderId.length < 12) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });

    const cancellable = ["Pending", "Confirmed"];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel an order with status "${order.status}".` });
    }

    order.status = "Cancelled";
    await order.save();

    return res.json({ success: true, message: "Order cancelled.", order: formatOrder(order) });
  } catch (err) {
    console.error("PATCH /orders/:orderId/cancel error:", err);
    // Handle CastError for invalid MongoDB ObjectId
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid order ID format." });
    }
    return res.status(500).json({ success: false, message: "Could not cancel order." });
  }
});

module.exports = router;
