const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String, default: null, trim: true },
  password: { type: String, required: true },

  address: {
    name:     { type: String, default: "" },
    phone:    { type: String, default: "" },
    street:   { type: String, default: "" },
    city:     { type: String, default: "" },
    pin:      { type: String, default: "" },
    landmark: { type: String, default: "" },
  },

  cart: [{
    productId: { type: String, required: true },
    quantity:  { type: Number, default: 1, min: 1 },
  }],

  favorites: [{ type: String }],

  // Password reset
  passwordResetToken:   { type: String, default: undefined },
  passwordResetExpires: { type: Date,   default: undefined },

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
