import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Helmet } from "react-helmet-async";
import { calculateShipping } from "../utils/pricing";
import {
  FiMapPin, FiPhone, FiGlobe, FiArrowRight, FiArrowLeft,
  FiShoppingBag, FiTag, FiCheck, FiX, FiHome
} from "react-icons/fi";

const STEPS = ["Cart", "Shipping", "Review", "Payment"];

const InputField = ({ label, icon: Icon, ...props }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />}
      <input
        {...props}
        className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${props.className || ""}`}
      />
    </div>
  </div>
);

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const { userInfo } = useAuth();

  const [form, setForm] = useState({
    address: userInfo?.address?.street || "",
    city: userInfo?.address?.city || "",
    state: userInfo?.address?.state || "",
    postalCode: userInfo?.address?.postalCode || "",
    country: "India",
    phone: userInfo?.phone || "",
  });

  useEffect(() => {
    if (cartItems.length === 0) navigate("/");
  }, [cartItems.length, navigate]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const totalPrice = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shippingPrice = calculateShipping(totalPrice);

  const submitHandler = (e) => {
    e.preventDefault();
    localStorage.setItem("shippingAddress", JSON.stringify(form));
    navigate("/placeorder");
  };

  if (cartItems.length === 0) return null;

  return (
    <div className="min-h-screen bg-brand-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Progress bar ────────────────────────── */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex flex-col items-center`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < 2 ? "bg-primary-600 text-white" : i === 1 ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"
                  } ${i === 1 ? "ring-4 ring-primary-100" : ""}`}>
                  {i < 1 ? <FiCheck className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-1 font-medium ${i <= 1 ? "text-primary-700" : "text-gray-400"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-12 sm:w-20 mt-[-16px] mx-1 ${i < 1 ? "bg-primary-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Shipping Form ──────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <FiMapPin className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="font-outfit font-bold text-gray-900 text-xl">Shipping Details</h2>
                  <p className="text-gray-500 text-sm">Where should we deliver your order?</p>
                </div>
              </div>

              <form onSubmit={submitHandler} className="space-y-4">
                <InputField
                  label="Full Address"
                  icon={FiHome}
                  type="text"
                  placeholder="House/Flat no, Street, Area"
                  required
                  value={form.address}
                  onChange={set("address")}
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputField label="City" type="text" placeholder="City" required value={form.city} onChange={set("city")} />
                  <InputField label="State" type="text" placeholder="State" required value={form.state} onChange={set("state")} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="PIN Code"
                    type="text"
                    placeholder="6-digit PIN"
                    required
                    pattern="\d{6}"
                    title="Enter a valid 6-digit PIN code"
                    value={form.postalCode}
                    onChange={set("postalCode")}
                  />
                  <InputField
                    label="Country"
                    icon={FiGlobe}
                    type="text"
                    value={form.country}
                    onChange={set("country")}
                  />
                </div>

                <InputField
                  label="Phone Number"
                  icon={FiPhone}
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  required
                  value={form.phone}
                  onChange={set("phone")}
                />

                {/* Trust badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {["🔒 Secure Checkout", "📦 Fast Delivery", "↩️ Easy Returns"].map(b => (
                    <span key={b} className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">{b}</span>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/cart")}
                    className="flex items-center gap-2 flex-1 justify-center border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm"
                  >
                    <FiArrowLeft className="w-4 h-4" /> Back to Cart
                  </button>
                  <button
                    type="submit"
                    className="btn-shine flex items-center gap-2 flex-1 justify-center bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3.5 rounded-xl font-bold hover:shadow-brand transition-all hover:scale-105 active:scale-95 text-sm"
                  >
                    Continue <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ── Order Summary sidebar ──────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-7 sticky top-24">
              <div className="flex items-center gap-2 mb-5">
                <FiShoppingBag className="w-5 h-5 text-primary-600" />
                <h3 className="font-outfit font-bold text-gray-900 text-lg">Order Summary</h3>
                <span className="ml-auto text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                  {cartItems.reduce((s, i) => s + i.qty, 0)} item{cartItems.reduce((s, i) => s + i.qty, 0) !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1 mb-4">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.qty}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 flex-shrink-0">₹{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">₹{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className={`font-semibold ${shippingPrice === 0 ? "text-primary-600" : ""}`}>
                    {shippingPrice === 0 ? "FREE 🎉" : `₹${shippingPrice}`}
                  </span>
                </div>
                {shippingPrice > 0 && (
                  <p className="text-xs text-primary-600 bg-primary-50 rounded-lg px-3 py-2">
                    Add ₹{(2000 - totalPrice).toLocaleString()} more for free shipping!
                  </p>
                )}
                <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>₹{(totalPrice + shippingPrice).toLocaleString()}</span>
                </div>
              </div>

              {/* Coupon hint */}
              <div className="mt-4 p-3 bg-accent-50 border border-accent-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <FiTag className="w-4 h-4 text-accent-600" />
                  <p className="text-xs font-semibold text-accent-700">Have a coupon? Apply it on the next step!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
