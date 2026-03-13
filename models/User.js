const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema({
  name:     { type: String, default: "" },
  phone:    { type: String, default: "" },
  street:   { type: String, default: "" },
  city:     { type: String, default: "" },
  pin:      { type: String, default: "" },
  landmark: { type: String, default: "" },
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  productId:   { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:     { type: String, default: "" },
    password:  { type: String, required: true },
    address:   { type: addressSchema, default: {} },
    cart:      { type: [cartItemSchema], default: [] },
    favorites:             { type: [String], default: [] }, // array of productIds
    passwordResetToken:    { type: String,  default: null },
    passwordResetExpires:  { type: Date,    default: null },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe user object (no password)
userSchema.methods.toSafeObject = function () {
  return {
    id:    this._id,
    name:  this.name,
    email: this.email,
    phone: this.phone,
  };
};

module.exports = mongoose.model("User", userSchema);
