// import Razorpay from "razorpay";
// import crypto from "crypto";
// import Order from "../models/Order.js";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_SECRET,
// });

// // @desc Create Razorpay Order
// // @route POST /api/payment/create
// // @access Private
// export const createPaymentOrder = async (req, res) => {
//   const { amount } = req.body;

//   const options = {
//     amount: amount * 100, // INR → paise
//     currency: "INR",
//     receipt: `receipt_${Date.now()}`,
//   };

//   const order = await razorpay.orders.create(options);
//   res.json(order);
// };

// // @desc Verify Razorpay Payment
// // @route POST /api/payment/verify
// // @access Private
// export const verifyPayment = async (req, res) => {
//   const {
//     razorpay_order_id,
//     razorpay_payment_id,
//     razorpay_signature,
//     orderId,
//   } = req.body;

//   const sign = razorpay_order_id + "|" + razorpay_payment_id;

//   const expectedSign = crypto
//     .createHmac("sha256", process.env.RAZORPAY_SECRET)
//     .update(sign)
//     .digest("hex");

//   if (expectedSign === razorpay_signature) {
//     const order = await Order.findById(orderId);
//     order.isPaid = true;
//     order.paidAt = Date.now();
//     await order.save();

//     res.json({ message: "Payment verified successfully" });
//   } else {
//     res.status(400).json({ message: "Payment verification failed" });
//   }
// };
