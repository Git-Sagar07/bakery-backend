const express  = require("express");
const router   = express.Router();
const User     = require("../models/User");
const { protect } = require("../middleware/auth");
const {
  validateAddress,
  validateProfile,
  validatePasswordChange,
} = require("../middleware/validate");

// Helper: fetch user or respond 404
const getUser = async (userId, res) => {
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ success: false, message: "User account not found." });
    return null;
  }
  return user;
};

// ── GET /api/user/address ─────────────────────────────────────
router.get("/address", protect, async (req, res) => {
  try {
    const user = await getUser(req.user._id, res);
    if (!user) return;
    return res.json({ success: true, address: user.address || null });
  } catch (err) {
    console.error("GET /user/address error:", err);
    return res.status(500).json({ success: false, message: "Could not load address." });
  }
});

// ── POST /api/user/address ────────────────────────────────────
router.post("/address", protect, async (req, res) => {
  try {
    const { name, phone, street, city, pin, landmark } = req.body;

    const validationError = validateAddress({ name, phone, street, city, pin });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const user = await getUser(req.user._id, res);
    if (!user) return;

    user.address = {
      name:     name.trim(),
      phone:    phone.trim(),
      street:   street.trim(),
      city:     city.trim(),
      pin:      pin.trim(),
      landmark: landmark ? landmark.trim() : "",
    };
    await user.save();

    return res.json({ success: true, message: "Address saved.", address: user.address });
  } catch (err) {
    console.error("POST /user/address error:", err);
    return res.status(500).json({ success: false, message: "Could not save address." });
  }
});

// ── PUT /api/user/profile ─────────────────────────────────────
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const validationError = validateProfile({ name, email, phone });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if new email is already taken by a different user
    if (normalizedEmail !== req.user.email) {
      const existing = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user._id },
      });
      if (existing) {
        return res.status(409).json({ success: false, message: "This email is already in use by another account." });
      }
    }

    const user = await getUser(req.user._id, res);
    if (!user) return;

    user.name  = name.trim();
    user.email = normalizedEmail;
    if (phone) user.phone = phone.trim();
    await user.save();

    return res.json({ success: true, message: "Profile updated.", user: user.toSafeObject() });
  } catch (err) {
    console.error("PUT /user/profile error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "This email is already in use by another account." });
    }
    return res.status(500).json({ success: false, message: "Could not update profile." });
  }
});

// ── PUT /api/user/password ────────────────────────────────────
router.put("/password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const validationError = validatePasswordChange({ currentPassword, newPassword });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const user = await getUser(req.user._id, res);
    if (!user) return;

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    // Clear auth cookie — user must log in again with new password
    res.clearCookie("token", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.json({ success: true, message: "Password changed successfully. Please login again." });
  } catch (err) {
    console.error("PUT /user/password error:", err);
    return res.status(500).json({ success: false, message: "Could not change password." });
  }
});

module.exports = router;
