const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const { protect } = require("../middleware/auth");
const { PRODUCTS } = require("./products");

// Helper: fetch user or respond 404
const getUser = async (userId, res) => {
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ success: false, message: "User account not found." });
    return null;
  }
  return user;
};

// ── GET /api/favorites ────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const user = await getUser(req.user._id, res);
    if (!user) return;

    const favorites = user.favorites
      .map(id => PRODUCTS.find(p => p.id === id))
      .filter(Boolean); // silently drop any stale IDs
    return res.json({ success: true, favorites });
  } catch (err) {
    console.error("GET /favorites error:", err);
    return res.status(500).json({ success: false, message: "Could not load favorites." });
  }
});

// ── POST /api/favorites  { productId }  — toggle ──────────────
router.post("/", protect, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId || typeof productId !== "string" || !productId.trim()) {
      return res.status(400).json({ success: false, message: "productId is required." });
    }

    const product = PRODUCTS.find(p => p.id === productId.trim());
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });

    const user = await getUser(req.user._id, res);
    if (!user) return;

    const idx = user.favorites.indexOf(productId);
    let action;

    if (idx > -1) {
      user.favorites.splice(idx, 1);
      action = "removed";
    } else {
      user.favorites.push(productId);
      action = "added";
    }

    await user.save();
    return res.json({ success: true, action, favorites: user.favorites });
  } catch (err) {
    console.error("POST /favorites error:", err);
    return res.status(500).json({ success: false, message: "Could not update favorites." });
  }
});

// ── DELETE /api/favorites/:productId ─────────────────────────
router.delete("/:productId", protect, async (req, res) => {
  try {
    const user = await getUser(req.user._id, res);
    if (!user) return;
    user.favorites = user.favorites.filter(id => id !== req.params.productId);
    await user.save();
    return res.json({ success: true, favorites: user.favorites });
  } catch (err) {
    console.error("DELETE /favorites/:productId error:", err);
    return res.status(500).json({ success: false, message: "Could not remove favorite." });
  }
});

module.exports = router;
