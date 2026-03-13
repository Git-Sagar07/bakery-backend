require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const app = express();

// ── Connect to MongoDB
connectDB();

// ── Routes
const authRoutes     = require("./routes/auth");
const { router: productRoutes } = require("./routes/products");
const cartRoutes     = require("./routes/cart");
const favoritesRoutes = require("./routes/favorites");
const ordersRoutes   = require("./routes/orders");
const userRoutes     = require("./routes/user");
const paymentRoutes  = require("./routes/payment");

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8080",
  "https://visitmybakery.netlify.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// ── Body parsing & cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check
app.get("/", (req, res) => {
  const mongoose = require("mongoose");
  const dbState = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbStatus = dbState[mongoose.connection.readyState] || "unknown";

  res.json({
    success: true,
    message: "🥐 Bakery API is running!",
    version: "1.0.0",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET  /api/products",
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "POST /api/auth/forgot-password",
      "POST /api/auth/reset-password",
      "POST /api/payment/create-order",
      "POST /api/payment/verify",
      "GET  /api/auth/me",
      "GET  /api/cart",
      "POST /api/cart",
      "PUT  /api/cart/:productId",
      "DEL  /api/cart/:productId",
      "DEL  /api/cart",
      "GET  /api/favorites",
      "POST /api/favorites",
      "DEL  /api/favorites/:productId",
      "GET  /api/orders",
      "POST /api/orders",
      "PAT  /api/orders/:id/cancel",
      "GET  /api/user/address",
      "POST /api/user/address",
      "PUT  /api/user/profile",
      "PUT  /api/user/password",
    ],
  });
});

app.use("/api/auth",      authRoutes);
app.use("/api/products",  productRoutes);
app.use("/api/cart",      cartRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/orders",    ordersRoutes);
app.use("/api/user",      userRoutes);
app.use("/api/payment",   paymentRoutes);

// ── 404 handler
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res
    .status(500)
    .json({ success: false, message: err.message || "Internal server error." });
});

// ── Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Bakery backend running on port ${PORT}`);
  console.log(`NODE_ENV = ${process.env.NODE_ENV || "development"}`);
});
