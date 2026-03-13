const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const { protect } = require("../middleware/auth");
const { PRODUCTS } = require("./products");

// Helper: build enriched cart from user's stored cart items
const buildCart = (cartItems) => {
  return cartItems
    .map(item => {
      const product = PRODUCTS.find(p => p.id === item.productId);
      if (!product) return null; // skip orphaned cart items
      return {
        id:       product.id,
        name:     product.name,
        price:    product.price,
        unit:     product.unit,
        image:    product.image,
        quantity: item.quantity,
      };
    })
    .filter(Boolean);
};

// Helper: fetch user and guard against deleted accounts
const getUser = async (userId, res) => {
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ success: false, message: "User account not found." });
    return null;
  }
  return user;
};

// ── GET /api/cart ─────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const user = await getUser(req.user._id, res);
    if (!user) return;
    return res.json({ success: true, cart: buildCart(user.cart) });
  } catch (err) {
    console.error("GET /cart error:", err);
    return res.status(500).json({ success: false, message: "Could not load cart." });
  }
});

// ── POST /api/cart  { productId, quantity } ───────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId || typeof productId !== "string" || !productId.trim()) {
      return res.status(400).json({ success: false, message: "productId is required." });
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive number." });
    }

    const product = PRODUCTS.find(p => p.id === productId.trim());
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });

    const user = await getUser(req.user._id, res);
    if (!user) return;

    const existing = user.cart.find(i => i.productId === productId);
    if (existing) {
      existing.quantity += qty;
    } else {
      user.cart.push({ productId, quantity: qty });
    }

    await user.save();
    return res.json({ success: true, cart: buildCart(user.cart) });
  } catch (err) {
    console.error("POST /cart error:", err);
    return res.status(500).json({ success: false, message: "Could not add to cart." });
  }
});

// ── PUT /api/cart/:productId  { quantity } ────────────────────
// Set absolute quantity. quantity <= 0 removes the item.
router.put("/:productId", protect, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity }  = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ success: false, message: "quantity is required." });
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) {
      return res.status(400).json({ success: false, message: "quantity must be a number." });
    }

    const user = await getUser(req.user._id, res);
    if (!user) return;

    if (qty <= 0) {
      user.cart = user.cart.filter(i => i.productId !== productId);
    } else {
      const item = user.cart.find(i => i.productId === productId);
      if (item) {
        item.quantity = qty;
      } else {
        // Item not in cart yet — validate product exists first
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product) return res.status(404).json({ success: false, message: "Product not found." });
        user.cart.push({ productId, quantity: qty });
      }
    }

    await user.save();
    return res.json({ success: true, cart: buildCart(user.cart) });
  } catch (err) {
    console.error("PUT /cart/:productId error:", err);
    return res.status(500).json({ success: false, message: "Could not update cart." });
  }
});

// ── DELETE /api/cart/:productId ───────────────────────────────
router.delete("/:productId", protect, async (req, res) => {
  try {
    const user = await getUser(req.user._id, res);
    if (!user) return;
    user.cart = user.cart.filter(i => i.productId !== req.params.productId);
    await user.save();
    return res.json({ success: true, cart: buildCart(user.cart) });
  } catch (err) {
    console.error("DELETE /cart/:productId error:", err);
    return res.status(500).json({ success: false, message: "Could not remove item." });
  }
});

// ── DELETE /api/cart  (clear entire cart) ─────────────────────
router.delete("/", protect, async (req, res) => {
  try {
    const user = await getUser(req.user._id, res);
    if (!user) return;
    user.cart = [];
    await user.save();
    return res.json({ success: true, cart: [] });
  } catch (err) {
    console.error("DELETE /cart error:", err);
    return res.status(500).json({ success: false, message: "Could not clear cart." });
  }
});

module.exports = router;
