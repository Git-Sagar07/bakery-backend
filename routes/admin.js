// routes/admin.js
// ─────────────────────────────────────────────────────────────
//  Admin-only routes. Protected by ADMIN_SECRET env var.
//  No separate admin user model needed — simple secret token.
// ─────────────────────────────────────────────────────────────
const express = require("express");
const router  = express.Router();
const Order   = require("../models/Order");
const User    = require("../models/User");

// ── Admin auth middleware ────────────────────────────────────
// Checks for X-Admin-Secret header matching ADMIN_SECRET env var
function adminProtect(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  next();
}

// ── GET /api/admin/stats ─────────────────────────────────────
router.get("/stats", adminProtect, async (req, res) => {
  try {
    const [totalOrders, totalUsers, revenueData, statusBreakdown] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments(),
      Order.aggregate([
        { $match: { status: { $nin: ["Cancelled"] } } },
        { $group: { _id: null, total: { $sum: "$grand_total" } } },
      ]),
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = revenueData[0]?.total || 0;
    const statusMap = {};
    statusBreakdown.forEach(s => { statusMap[s._id] = s.count; });

    return res.json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        totalRevenue,
        statusBreakdown: statusMap,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ success: false, message: "Could not load stats." });
  }
});

// ── GET /api/admin/orders?status=all|Confirmed|... ───────────
router.get("/orders", adminProtect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;

    const orders = await Order.find(filter)
      .sort({ placed_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("userId", "name email phone");

    const total = await Order.countDocuments(filter);

    return res.json({
      success: true,
      orders: orders.map(o => ({
        _id:        o._id,
        id:         `ORD-${o._id.toString().slice(-6).toUpperCase()}`,
        customer:   o.userId ? { name: o.userId.name, email: o.userId.email, phone: o.userId.phone } : {},
        items:      o.items,
        grand_total: o.grand_total,
        status:     o.status,
        placed_at:  o.placed_at,
        address:    o.address,
        deliverySlot: o.deliverySlot || null,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Admin orders error:", err);
    return res.status(500).json({ success: false, message: "Could not load orders." });
  }
});

// ── PATCH /api/admin/orders/:orderId/status ──────────────────
// Updates order status — this is how orders move from Confirmed → Out for Delivery → Delivered
router.patch("/orders/:orderId/status", adminProtect, async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ["Pending", "Confirmed", "Out for Delivery", "Delivered", "Cancelled", "Completed"];

    if (!VALID.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID.join(", ")}` });
    }

    const order = await Order.findById(req.params.orderId).populate("userId", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });

    const prevStatus = order.status;
    order.status = status;
    await order.save();

    // Send email notification on key status changes
    if (["Out for Delivery", "Delivered"].includes(status) && order.userId?.email) {
      const { sendStatusUpdateEmail } = require("./email");
      sendStatusUpdateEmail({
        toEmail:   order.userId.email,
        userName:  order.userId.name,
        orderId:   `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
        newStatus: status,
      }).catch(err => console.error("Status email error:", err));
    }

    return res.json({
      success: true,
      message: `Order updated: ${prevStatus} → ${status}`,
      order: {
        _id:    order._id,
        id:     `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
        status: order.status,
      },
    });
  } catch (err) {
    console.error("Admin update status error:", err);
    if (err.name === "CastError") return res.status(400).json({ success: false, message: "Invalid order ID." });
    return res.status(500).json({ success: false, message: "Could not update order." });
  }
});

// ── GET /api/admin/users ─────────────────────────────────────
router.get("/users", adminProtect, async (req, res) => {
  try {
    const users = await User.find({}, "name email phone createdAt").sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Could not load users." });
  }
});

module.exports = { router, adminProtect };
