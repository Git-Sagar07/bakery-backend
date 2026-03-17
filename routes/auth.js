const express  = require("express");
const router   = express.Router();
const jwt      = require("jsonwebtoken");
const User     = require("../models/User");
const { protect } = require("../middleware/auth");
const { validateSignup, validateLogin } = require("../middleware/validate");
const { sendWelcomeEmail } = require("./email");
const { authLimiter, resetLimiter } = require("../middleware/rateLimiter");

// Helper to issue JWT cookie
const signToken = (userId, res) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ── POST /api/auth/signup ─────────────────────────────────────
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Deep validation (password strength, phone format, etc.)
    const validationError = validateSignup({ name, email, phone, password });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const user = await User.create({
      name:  name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : "",
      password,
    });

    signToken(user._id, res);

    // Send welcome email (non-blocking)
    sendWelcomeEmail({ toEmail: user.email, userName: user.name })
      .catch(err => console.error("Welcome email error:", err));

    return res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user:    user.toSafeObject(),
    });
  } catch (err) {
    console.error("Signup error:", err);
    // Handle Mongoose duplicate key (race condition safety net)
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const validationError = validateLogin({ email, password });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: "No account found with this email. Please sign up first.", code: "NO_ACCOUNT" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password. Please try again.", code: "WRONG_PASSWORD" });
    }

    signToken(user._id, res);

    return res.json({
      success: true,
      message: "Login successful!",
      user:    user.toSafeObject(),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    return res.json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ success: false, message: "Server error during logout." });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get("/me", protect, (req, res) => {
  try {
    return res.json({ success: true, user: req.user.toSafeObject() });
  } catch (err) {
    console.error("Auth/me error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});


// ── POST /api/auth/forgot-password ───────────────────────────
// Generates a reset token, stores hashed version, sends email
router.post("/forgot-password", resetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always respond the same — don't reveal if email exists (security)
    const safeResponse = { success: true, message: "If this email is registered, a reset link has been sent." };

    if (!user) return res.json(safeResponse);

    // Generate a random token
    const crypto     = require("crypto");
    const rawToken   = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Store hashed token + 15 min expiry
    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    // Build reset URL — points to frontend reset page with raw token
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://visitmybakery.netlify.app";
    const resetUrl = `${FRONTEND_URL}/pages/reset-password.html?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Send email (non-blocking fail — still clear token if email fails)
    const { sendPasswordResetEmail } = require("./email");
    try {
      await sendPasswordResetEmail({ toEmail: user.email, userName: user.name, resetUrl });
    } catch (emailErr) {
      console.error("Reset email send failed:", emailErr);
      // Clear token so user can try again
      user.passwordResetToken   = null;
      user.passwordResetExpires = null;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: "Could not send reset email. Please try again." });
    }

    return res.json(safeResponse);
  } catch (err) {
    console.error("Forgot-password error:", err);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
// Validates token, updates password, clears token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ success: false, message: "Token, email, and new password are required." });
    }

    // Password strength check
    if (newPassword.length < 8)             return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    if (!/[A-Z]/.test(newPassword))          return res.status(400).json({ success: false, message: "Password must contain an uppercase letter." });
    if (!/[0-9]/.test(newPassword))          return res.status(400).json({ success: false, message: "Password must contain a number." });
    if (!/[^A-Za-z0-9]/.test(newPassword))   return res.status(400).json({ success: false, message: "Password must contain a special character." });

    const crypto      = require("crypto");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email:                email.trim().toLowerCase(),
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: new Date() }, // not expired
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Reset link is invalid or has expired. Please request a new one." });
    }

    // Update password and clear reset fields
    user.password             = newPassword; // pre-save hook will hash it
    user.passwordResetToken   = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ success: true, message: "Password reset successfully! You can now log in." });
  } catch (err) {
    console.error("Reset-password error:", err);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

module.exports = router;
