import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowRight, FiTruck, FiTag, FiX, FiLoader, FiPercent } from "react-icons/fi";
import { calculateShipping, calculateTax, amountToFreeShipping, FREE_SHIPPING_THRESHOLD, formatPrice } from "../utils/pricing";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import api from "../services/api";
import { readJSON, writeJSON, removeRaw, KEYS } from "../utils/storage";

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, updateQty, removeFromCart, cartTotal, clearCart } = useCart();

  const [appliedCoupon, setAppliedCoupon] = useState(() => readJSON(KEYS.COUPON, null));
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showCoupons, setShowCoupons] = useState(false);

  // Fetch available public coupons on mount
  useEffect(() => {
    let active = true;
    api.get("/coupons/public")
      .then((res) => {
        if (active && Array.isArray(res.data)) {
          setAvailableCoupons(res.data);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || "").trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }
    setCouponLoading(true);
    setCouponError("");
    try {
      const { data } = await api.post("/coupons/validate", {
        code,
        orderAmount: cartTotal,
        cartItems: cartItems.map((i) => ({ product: i._id, qty: i.qty, price: i.price })),
      });
      const couponObj = {
        code: data.code || data.coupon?.code || code,
        discount: Number(data.discount ?? data.discountAmount ?? 0),
        description: data.description || data.coupon?.description || "",
        discountType: data.discountType || data.coupon?.discountType || "flat",
        discountValue: Number(data.discountValue ?? data.coupon?.discountValue ?? 0),
      };
      setAppliedCoupon(couponObj);
      writeJSON(KEYS.COUPON, couponObj);
      setCouponInput("");
      setShowCoupons(false);
      toast.success(`Coupon ${couponObj.code} applied! You saved ₹${couponObj.discount} 🎉`);
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or inapplicable coupon code";
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    removeRaw(KEYS.COUPON);
    setCouponError("");
    toast.success("Coupon removed");
  };

  const shippingPrice = calculateShipping(cartTotal);
  const taxPrice = calculateTax(cartTotal);
  const couponDiscount = appliedCoupon ? (Number(appliedCoupon.discount) || 0) : 0;
  const orderTotal = Math.max(0, cartTotal - couponDiscount) + shippingPrice + taxPrice;
  const remaining = amountToFreeShipping(cartTotal);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-brand-bg">
        <Helmet>
          <title>Shopping Cart | RK Saree &amp; Fashion Hub</title>
        </Helmet>
        <div className="text-center py-20">
          <div className="text-8xl mb-6">🛒</div>
          <h2 className="font-outfit text-3xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Discover our amazing collection and add something special</p>
          <Link
            to="/category/Women"
            className="inline-flex items-center gap-2 bg-primary-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-primary-700 transition-all hover:shadow-brand-lg"
          >
            <FiShoppingBag /> Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-outfit text-3xl font-bold text-gray-900">
            Shopping Cart <span className="text-lg text-gray-400 font-normal">({cartItems.length} items)</span>
          </h1>
          <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1.5">
            <FiTrash2 className="w-4 h-4" /> Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.cartKey}
                className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex gap-4 animate-fade-in"
              >
                <Link to={`/product/${item._id}`} className="flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-28 sm:w-32 sm:h-36 object-cover rounded-xl border border-gray-100"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-primary-500 font-semibold uppercase mb-1">{item.category}</p>
                      <Link to={`/product/${item._id}`}>
                        <h3 className="font-outfit font-semibold text-gray-900 hover:text-primary-600 text-sm sm:text-base leading-snug line-clamp-2">
                          {item.name}
                        </h3>
                      </Link>
                      {item.size && (
                        <span className="inline-block mt-2 text-xs border border-gray-200 text-gray-600 px-2.5 py-0.5 rounded-lg font-medium">
                          Size: {item.size}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.cartKey)}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => updateQty(item.cartKey, item.qty - 1)}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        <FiMinus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center font-semibold text-sm text-gray-900">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.cartKey, item.qty + 1)}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        <FiPlus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-outfit font-bold text-gray-900">
                        ₹{(item.price * item.qty).toLocaleString("en-IN")}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400">
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="line-through">₹{item.originalPrice.toLocaleString("en-IN")}</span>
                        )}
                        <span>₹{item.price.toLocaleString("en-IN")} each</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 sticky top-24">
              <h2 className="font-outfit text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              {/* Free shipping progress */}
              {cartTotal < FREE_SHIPPING_THRESHOLD && (
                <div className="bg-primary-50 rounded-xl p-4 mb-5 border border-primary-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FiTruck className="w-4 h-4 text-primary-600" />
                    <p className="text-xs font-medium text-primary-700">
                      Add {formatPrice(remaining)} more for FREE delivery!
                    </p>
                  </div>
                  <div className="w-full h-1.5 bg-primary-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Coupon Section */}
              <div className="border-t border-b border-gray-100 py-4 mb-5">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <FiTag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{appliedCoupon.code} APPLIED</span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Saving {formatPrice(appliedCoupon.discount)}
                        {appliedCoupon.description ? ` (${appliedCoupon.description})` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 p-1"
                      aria-label="Remove coupon"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon(couponInput)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs uppercase font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        disabled={couponLoading || !couponInput.trim()}
                        onClick={() => handleApplyCoupon(couponInput)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        {couponLoading ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-red-600 mt-1.5">{couponError}</p>
                    )}

                    {availableCoupons.length > 0 && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setShowCoupons((v) => !v)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800"
                        >
                          <FiPercent className="w-3.5 h-3.5" />
                          <span>
                            {showCoupons ? "Hide" : "View"} {availableCoupons.length} Available Offer{availableCoupons.length === 1 ? "" : "s"}
                          </span>
                        </button>

                        {showCoupons && (
                          <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto pr-1">
                            {availableCoupons.map((c) => {
                              const meetsMin = !c.minOrderAmount || cartTotal >= c.minOrderAmount;
                              return (
                                <div
                                  key={c.code}
                                  className={`p-2.5 rounded-xl border border-dashed transition-all flex items-center justify-between gap-2 ${
                                    meetsMin
                                      ? "bg-accent-50/40 border-accent-300 hover:bg-accent-50"
                                      : "bg-gray-50 border-gray-200 opacity-70"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-xs text-primary-800 tracking-wide">
                                        {c.code}
                                      </span>
                                      <span className="text-[10px] bg-primary-100 text-primary-800 px-1.5 py-0.2 rounded font-semibold">
                                        {c.discountType === "percentage"
                                          ? `${c.discountValue}% OFF`
                                          : `₹${c.discountValue} OFF`}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                                      {c.description || (c.minOrderAmount > 0 ? `Min order ₹${c.minOrderAmount}` : "No minimum")}
                                    </p>
                                    {!meetsMin && (
                                      <p className="text-[10px] text-amber-700 font-medium">
                                        Add {formatPrice(c.minOrderAmount - cartTotal)} more to apply
                                      </p>
                                    )}
                                  </div>
                                  {meetsMin ? (
                                    <button
                                      type="button"
                                      onClick={() => handleApplyCoupon(c.code)}
                                      disabled={couponLoading}
                                      className="text-xs font-bold text-accent-700 hover:text-accent-800 px-2 py-1 bg-white rounded-lg border border-accent-200 shadow-xs shrink-0"
                                    >
                                      Apply
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                                      Locked
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({cartItems.reduce((a, b) => a + b.qty, 0)} items)</span>
                  <span className="font-medium text-gray-900">₹{cartTotal.toLocaleString("en-IN")}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className={`font-medium ${shippingPrice === 0 ? "text-green-600" : "text-gray-900"}`}>
                    {shippingPrice === 0 ? "FREE" : formatPrice(shippingPrice)}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-outfit font-bold text-gray-900">Total</span>
                  <span className="font-outfit font-black text-xl text-gray-900">₹{orderTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/checkout")}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-4 rounded-2xl hover:shadow-brand-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Proceed to Checkout <FiArrowRight />
              </button>

              <Link to="/category/Women" className="block text-center text-sm text-primary-600 font-medium mt-4 hover:underline">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
