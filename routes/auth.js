require("dotenv").config();

const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");

const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { authLimiter, resetLimiter } = require("../middleware/rateLimiter");
const { sendPasswordResetEmail, sendWelcomeEmail } = require("./email");

const router = express.Router();

function setTokenCookie(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

// POST /api/auth/signup
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email and password are required." });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ success: false, message: "Account already exists." });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(), email: email.toLowerCase().trim(),
      phone: phone?.trim() || null, password: hashed,
    });

    setTokenCookie(res, user._id);

    sendWelcomeEmail({ toEmail: user.email, userName: user.name })
      .catch(e => console.error("Welcome email error:", e.message));

    return res.status(201).json({
      success: true, message: "Account created!",
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ success: false, message: "Server error during signup." });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(401).json({ success: false, code: "NO_ACCOUNT", message: "No account found with this email." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, code: "WRONG_PASSWORD", message: "Incorrect password." });

    setTokenCookie(res, user._id);
    return res.json({
      success: true, message: "Login successful!",
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.json({ success: true, message: "Logged out." });
});

// GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  try {
    return res.json({ success: true, user: req.user });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", resetLimiter, async (req, res) => {
  const GENERIC_OK = {
    success: true,
    message: "If this email is registered, reset instructions have been sent.",
  };
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json(GENERIC_OK); // silently succeed

    // Generate raw token
    const rawToken    = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const FRONTEND = (process.env.FRONTEND_URL || "https://visitmybakery.netlify.app").replace(/\/$/, "");
    const resetUrl  = `${FRONTEND}/pages/reset-password.html?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    console.log("Reset URL:", resetUrl);

    try {
      await sendPasswordResetEmail({ toEmail: user.email, userName: user.name, resetUrl });
      console.log("Reset email sent to:", user.email);
    } catch (emailErr) {
      console.error("Reset email failed:", emailErr.message);
      user.passwordResetToken   = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please check your Resend API key and try again.",
      });
    }

    return res.json(GENERIC_OK);
  } catch (err) {
    console.error("Forgot-password error:", err);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", resetLimiter, async (req, res) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password)
      return res.status(400).json({ success: false, message: "Token, email and new password are required." });

    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ success: false, message: "Must contain uppercase letter." });
    if (!/[0-9]/.test(password)) return res.status(400).json({ success: false, message: "Must contain a number." });
    if (!/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ success: false, message: "Must contain a special character." });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email:                email.toLowerCase().trim(),
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ success: false, message: "Reset link is invalid or has expired. Please request a new one." });

    user.password             = await bcrypt.hash(password, 12);
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.clearCookie("token", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.json({ success: true, message: "Password updated! Please log in with your new password." });
  } catch (err) {
    console.error("Reset-password error:", err);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

module.exports = router;
