const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  name:     { type: String, required: true },
  price:    { type: Number, required: true },
  quantity: { type: Number, required: true },
  image:    { type: String, default: "" },
  unit:     { type: String, default: "" },
}, { _id: false });

const orderAddressSchema = new mongoose.Schema({
  name:     { type: String },
  phone:    { type: String },
  street:   { type: String },
  city:     { type: String },
  pin:      { type: String },
  landmark: { type: String },
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items:       { type: [orderItemSchema], required: true },
    address:     { type: orderAddressSchema },
    subtotal:    { type: Number, required: true },
    delivery:    { type: Number, default: 0 },
    gst:         { type: Number, default: 0 },
    discount:    { type: Number, default: 0 },
    grand_total: { type: Number, required: true },
    couponCode:  { type: String, default: null },
    status:      {
      type: String,
      enum: ["Pending", "Confirmed", "Out for Delivery", "Delivered", "Cancelled", "Completed"],
      default: "Confirmed",
    },
    placed_at:        { type: Date, default: Date.now },
    paymentId:        { type: String, default: null },  // Razorpay payment_id
    razorpayOrderId:  { type: String, default: null },  // Razorpay order_id
  },
  { timestamps: true }
);

// Virtual for formatted id (use orderId like ORD-XXXXXX)
orderSchema.virtual("id").get(function () {
  return `ORD-${this._id.toString().slice(-6).toUpperCase()}`;
});

orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Order", orderSchema);
