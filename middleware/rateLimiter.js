// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

// ── Auth endpoints (login, signup, forgot-password)
// Strict: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs:    15 * 60 * 1000,  // 15 minutes
  max:         10,
  message:     { success: false, message: "Too many attempts. Please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,  // only counts failed requests
});

// ── Password reset — even stricter: 5 per hour
const resetLimiter = rateLimit({
  windowMs:    60 * 60 * 1000,  // 1 hour
  max:         5,
  message:     { success: false, message: "Too many reset attempts. Please wait 1 hour." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── General API — loose limit: 200 requests per 10 minutes per IP
const generalLimiter = rateLimit({
  windowMs:    10 * 60 * 1000,  // 10 minutes
  max:         200,
  message:     { success: false, message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Contact form: 5 messages per hour
const contactLimiter = rateLimit({
  windowMs:    60 * 60 * 1000,
  max:         5,
  message:     { success: false, message: "Too many messages sent. Please wait an hour." },
  standardHeaders: true,
  legacyHeaders:   false,
});

module.exports = { authLimiter, resetLimiter, generalLimiter, contactLimiter };
