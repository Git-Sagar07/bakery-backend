require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const cookieParser = require("cookie-parser");
const connectDB  = require("./config/db");
const { sanitizeBody } = require("./middleware/sanitize");
const { generalLimiter, authLimiter, resetLimiter, contactLimiter } = require("./middleware/rateLimiter");

const app = express();

// ── Connect to MongoDB
connectDB();

// ── Security headers (helmet)
app.use(helmet({
  crossOriginResourcePolicy: false,  // allow images to load cross-origin
}));

// ── Routes
const authRoutes    = require("./routes/auth");
const { router: productRoutes } = require("./routes/products");
const cartRoutes    = require("./routes/cart");
const favoritesRoutes = require("./routes/favorites");
const ordersRoutes  = require("./routes/orders");
const userRoutes    = require("./routes/user");
const paymentRoutes = require("./routes/payment");
const contactRoutes = require("./routes/contact");
const { router: adminRoutes } = require("./routes/admin");

// ── CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8080",
  "https://visitmybakery.netlify.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// ── Body parsing, cookies, sanitization
app.use(express.json({ limit: "10kb" }));       // limit body size
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeBody);                           // strip XSS + MongoDB operators

// ── General rate limit on all API routes
app.use("/api", generalLimiter);

// ── Health check
app.get("/", (req, res) => {
  const mongoose = require("mongoose");
  const dbState  = ["disconnected","connected","connecting","disconnecting"];
  res.json({
    success: true,
    message: "🥐 Bakery API is running!",
    version: "2.0.0",
    database: dbState[mongoose.connection.readyState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

// ── Mount routes (auth routes have their own tighter limiters applied inside)
app.use("/api/auth",      authRoutes);
app.use("/api/products",  productRoutes);
app.use("/api/cart",      cartRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/orders",    ordersRoutes);
app.use("/api/user",      userRoutes);
app.use("/api/payment",   paymentRoutes);
app.use("/api/contact",   contactLimiter, contactRoutes);
app.use("/api/admin",     adminRoutes);

// ── 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ success: false, message: err.message || "Internal server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Bakery backend running on port ${PORT}`);
  console.log(`NODE_ENV = ${process.env.NODE_ENV || "development"}`);
});
