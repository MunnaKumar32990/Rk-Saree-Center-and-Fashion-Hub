import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";
import { Helmet } from "react-helmet-async";
import { calculateShipping } from "../utils/pricing";
import {
  FiMapPin, FiTag, FiCheck, FiX, FiLoader, FiShoppingBag,
  FiArrowLeft, FiLock, FiPercent, FiGift, FiPhone, FiPackage
} from "react-icons/fi";

const STEPS = ["Cart", "Shipping", "Review", "Payment"];

// ─── Available Coupons shown to user ────────────────────────────────────────
const PROMO_COUPONS = [
  { code: "WELCOME10", label: "10% off", desc: "Min order ₹500", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { code: "FLAT200", label: "₹200 off", desc: "Min order ₹1500", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { code: "SAREE20", label: "20% off", desc: "Min order ₹2000", color: "bg-violet-50 border-violet-200 text-violet-700" },
  { code: "FESTIVE15", label: "15% off", desc: "Min order ₹1000", color: "bg-rose-50 border-rose-200 text-rose-700" },
  { code: "FREESHIP", label: "Free ship", desc: "Any order", color: "bg-sky-50 border-sky-200 text-sky-700" },
];

const PlaceOrder = () => {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Razorpay"); // "Razorpay" | "COD"

  // ── Coupon state ──────────────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount, description }
  const [couponError, setCouponError] = useState("");
  const [showCoupons, setShowCoupons] = useState(false);

  const shippingAddress = (() => {
    try { return JSON.parse(localStorage.getItem("shippingAddress")); }
    catch { return null; }
  })();

  useEffect(() => {
    if (!shippingAddress) navigate("/checkout");
    if (cartItems.length === 0) navigate("/");
  }, [shippingAddress, cartItems.length, navigate]);

  // ── Price calculations ────────────────────────────────────────────────────
  const itemsPrice = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shippingPrice = calculateShipping(itemsPrice);
  const discount = appliedCoupon?.discount || 0;
  const totalPrice = Math.max(0, itemsPrice + shippingPrice - discount);

  // ── Apply coupon ──────────────────────────────────────────────────────────
  const applyCoupon = async (code) => {
    const c = (code || couponInput).trim().toUpperCase();
    if (!c) { setCouponError("Enter a coupon code"); return; }

    setCouponLoading(true);
    setCouponError("");
    try {
      const { data } = await api.post("/coupons/validate", {
        code: c,
        orderAmount: itemsPrice,
      });
      // Backend returns: { valid, coupon: { code, description, ... }, discountAmount }
      const applied = {
        code: data.coupon.code,
        description: data.coupon.description,
        discount: data.discountAmount,
      };
      setAppliedCoupon(applied);
      setCouponInput(applied.code);
      setShowCoupons(false);
      toast.success(`🎉 Coupon "${applied.code}" applied! You save ₹${applied.discount}`);
    } catch (err) {
      setCouponError(err.response?.data?.message || "Invalid coupon");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
    toast("Coupon removed", { icon: "✖" });
  };

  // ── Place order ───────────────────────────────────────────────────────────
  const placeOrderHandler = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/orders", {
        orderItems: cartItems.map((item) => ({
          name: item.name,
          qty: item.qty,
          image: item.image,
          price: item.price,
          product: item._id,
          size: item.size || "",
          color: item.selectedColor || "",
        })),
        shippingAddress,
        paymentMethod,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: discount,
      });

      clearCart();
      if (paymentMethod === "COD") {
        // COD orders bypass payment — go straight to success
        navigate("/success", { state: { orderId: data._id, isCOD: true } });
      } else {
        navigate(`/payment/${data._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!shippingAddress || cartItems.length === 0) return null;

  return (
    <div className="min-h-screen bg-brand-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Progress stepper ────────────────────── */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < 2 ? "bg-primary-600 text-white" : i === 2 ? "bg-primary-600 text-white ring-4 ring-primary-100" : "bg-gray-200 text-gray-500"
                  }`}>
                  {i < 2 ? <FiCheck className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-1 font-medium ${i <= 2 ? "text-primary-700" : "text-gray-400"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-12 sm:w-20 mt-[-16px] mx-1 ${i < 2 ? "bg-primary-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Left: Address + Items ──────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Shipping card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FiMapPin className="w-5 h-5 text-primary-600" />
                  <h3 className="font-outfit font-bold text-gray-900">Delivery Address</h3>
                </div>
                <Link to="/checkout" className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1">
                  <FiArrowLeft className="w-3 h-3" /> Edit
                </Link>
              </div>
              <div className="bg-primary-50 rounded-xl p-4 space-y-1">
                <p className="font-semibold text-gray-800 text-sm">{shippingAddress.address}</p>
                <p className="text-gray-600 text-sm">{shippingAddress.city}{shippingAddress.state ? `, ${shippingAddress.state}` : ""} — {shippingAddress.postalCode}</p>
                <p className="text-gray-600 text-sm">{shippingAddress.country}</p>
                <div className="flex items-center gap-1.5 pt-1">
                  <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-gray-600 text-sm">{shippingAddress.phone}</p>
                </div>
              </div>
            </div>

            {/* Order items card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <FiPackage className="w-5 h-5 text-primary-600" />
                <h3 className="font-outfit font-bold text-gray-900">Order Items</h3>
                <span className="ml-auto text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                  {cartItems.reduce((s, i) => s + i.qty, 0)} item{cartItems.reduce((s, i) => s + i.qty, 0) !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl border border-gray-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.qty} × ₹{item.price.toLocaleString()}</p>
                    </div>
                    <p className="font-bold text-gray-900 flex-shrink-0">₹{(item.price * item.qty).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Coupon Section ───────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <FiTag className="w-5 h-5 text-accent-600" />
                <h3 className="font-outfit font-bold text-gray-900">Coupon / Promo Code</h3>
                <button
                  onClick={() => setShowCoupons(!showCoupons)}
                  className="ml-auto text-xs text-primary-600 font-semibold hover:underline"
                >
                  {showCoupons ? "Hide coupons" : "View available coupons"}
                </button>
              </div>

              {/* Available coupons list */}
              {showCoupons && (
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PROMO_COUPONS.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCouponInput(c.code); setShowCoupons(false); }}
                      className={`border rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${c.color}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm font-mono">{c.code}</span>
                        <span className="text-xs font-bold bg-white/60 rounded-full px-2 py-0.5">{c.label}</span>
                      </div>
                      <p className="text-xs mt-0.5 opacity-80">{c.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Coupon input + apply */}
              {appliedCoupon ? (
                <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-xl p-4">
                  <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <FiCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-primary-800 text-sm">"{appliedCoupon.code}" applied!</p>
                    <p className="text-xs text-primary-600">{appliedCoupon.description} — saving ₹{appliedCoupon.discount.toLocaleString()}</p>
                  </div>
                  <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                    <button
                      onClick={() => applyCoupon()}
                      disabled={couponLoading || !couponInput.trim()}
                      className="btn-shine flex items-center gap-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold px-5 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all active:scale-95 text-sm"
                    >
                      {couponLoading ? <FiLoader className="w-4 h-4 animate-spin" /> : <><FiGift className="w-4 h-4" /> Apply</>}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <FiX className="w-3.5 h-3.5" /> {couponError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Price Summary + Place Order ─── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-5">
                <FiShoppingBag className="w-5 h-5 text-primary-600" />
                <h3 className="font-outfit font-bold text-gray-900 text-lg">Price Details</h3>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Items ({cartItems.reduce((s, i) => s + i.qty, 0)})</span>
                  <span className="font-semibold">₹{itemsPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className={`font-semibold ${shippingPrice === 0 ? "text-primary-600" : ""}`}>
                    {shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-primary-600">
                    <span className="flex items-center gap-1">
                      <FiPercent className="w-3.5 h-3.5" /> Coupon ({appliedCoupon.code})
                    </span>
                    <span className="font-bold">− ₹{discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-xl text-gray-900">
                  <span>Total</span>
                  <span>₹{totalPrice.toLocaleString()}</span>
                </div>

                {discount > 0 && (
                  <div className="bg-primary-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <FiCheck className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-primary-700">
                      You're saving ₹{discount.toLocaleString()} on this order!
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="mb-5">
                <p className="text-sm font-bold text-gray-800 mb-3">Payment Method</p>
                <div className="space-y-2">
                  {/* Razorpay */}
                  <button
                    onClick={() => setPaymentMethod("Razorpay")}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                      paymentMethod === "Razorpay"
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      paymentMethod === "Razorpay" ? "border-primary-500" : "border-gray-300"
                    }`}>
                      {paymentMethod === "Razorpay" && <div className="w-2 h-2 bg-primary-500 rounded-full" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Pay Online</p>
                      <p className="text-xs text-gray-500">Cards, UPI, Net Banking via Razorpay</p>
                    </div>
                    <FiLock className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* COD */}
                  <button
                    onClick={() => setPaymentMethod("COD")}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                      paymentMethod === "COD"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      paymentMethod === "COD" ? "border-green-500" : "border-gray-300"
                    }`}>
                      {paymentMethod === "COD" && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Cash on Delivery</p>
                      <p className="text-xs text-gray-500">Pay ₹{totalPrice.toLocaleString()} when delivered</p>
                    </div>
                    <span className="text-lg">💵</span>
                  </button>
                </div>
              </div>

              <button
                onClick={placeOrderHandler}
                disabled={loading}
                className={`btn-shine w-full py-4 rounded-xl font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  paymentMethod === "COD"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-[0_8px_25px_rgba(34,197,94,0.4)]"
                    : "bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-brand-lg"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <FiLoader className="w-5 h-5 animate-spin" /> Processing…
                  </span>
                ) : paymentMethod === "COD" ? (
                  <span className="flex items-center justify-center gap-2">
                    💵 Confirm COD Order — ₹{totalPrice.toLocaleString()}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <FiLock className="w-4 h-4" /> Pay Now — ₹{totalPrice.toLocaleString()}
                  </span>
                )}
              </button>

              <button
                onClick={() => navigate("/checkout")}
                className="w-full mt-3 flex items-center justify-center gap-2 text-gray-500 text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                <FiArrowLeft className="w-4 h-4" /> Back to Shipping
              </button>

              {/* Security assurance */}
              <div className="mt-4 flex flex-col gap-1.5">
                {["🔒 256-bit SSL encryption", "✅ Razorpay verified", "📦 Ships in 2–5 days"].map(t => (
                  <p key={t} className="text-xs text-gray-400 flex items-center gap-1">{t}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;
