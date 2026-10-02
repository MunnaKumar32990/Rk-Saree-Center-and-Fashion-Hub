import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiTag, FiCheck, FiX, FiLoader, FiShoppingBag, FiArrowLeft, FiLock, FiGift, FiPhone, FiCopy, FiAlertCircle, FiMessageCircle } from "react-icons/fi";

import api from "../services/api";
import { useCart } from "../context/CartContext";
import Seo from "../components/Seo";
import TrustBar, { DeliveryPromise, PaymentMarks } from "../components/TrustBar";
import {
  calculateOrderTotals,
  getShippingMethod,
  formatPrice,
} from "../utils/pricing";
import { readJSON, writeJSON, removeRaw, KEYS } from "../utils/storage";

const STEPS = ["Cart", "Shipping", "Review"];

/**
 * PlaceOrder — the review and payment-method step.
 *
 * CRITICAL FIX — the coupon shown was not the coupon charged.
 *
 * The frontend validated coupons against the Mongo Coupon collection via
 * `POST /coupons/validate`, then `POST /orders` re-validated against a
 * *hardcoded array* in the backend and silently ignored the result if the code
 * wasn't in it. So an admin-created coupon displayed "You're saving ₹400!" and
 * was then dropped: the customer was charged the full amount at the Razorpay
 * screen. That is a chargeback and a support ticket waiting to happen.
 *
 * Now:
 *  - Coupon validation posts the actual cart contents, so the server computes
 *    the discount from database prices, not a client-supplied amount.
 *  - The available-coupon list comes from the database instead of a
 *    hardcoded array in this file, so offers advertised here are offers that
 *    will be honoured.
 *  - `couponDiscount` is no longer sent. The server ignores it (correctly), and
 *    sending it only invites confusion.
 *  - Order creation fails loudly if the coupon can't be honoured, rather than
 *    quietly charging full price.
 *
 * Other fixes:
 *  - `item.selectedColor` was read but `addToCart` stores `color`, so the colour
 *    never reached the order.
 *  - Gift options and delivery notes collected on the checkout step are now
 *    actually sent.
 *  - COD eligibility is checked against this PIN code and cart value before COD
 *    is offered, so the option can't vanish at the last step.
 *  - A real, committed delivery date range replaces a hard-coded
 *    "Ships in 2-5 days" string that contradicted two other pages.
 */
const PlaceOrder = () => {
  const navigate = useNavigate();
  const { cartItems, clearCart, outOfStockItems } = useCart();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("COD");

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(() => readJSON(KEYS.COUPON, null));
  const [couponError, setCouponError] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [copyState, setCopyState] = useState("");

  const [quote, setQuote] = useState(null);

  const shippingAddress = useMemo(() => readJSON(KEYS.ADDRESS, null), []);

  useEffect(() => {
    if (!shippingAddress) navigate("/checkout", { replace: true });
  }, [shippingAddress, navigate]);

  useEffect(() => {
    if (cartItems.length === 0 && !loading) navigate("/", { replace: true });
  }, [cartItems.length, loading, navigate]);

  // The address now carries the shipping method chosen at the previous step.
  const shippingMethod = shippingAddress?.shippingMethod || "standard";
  const method = getShippingMethod(shippingMethod);

  const itemsPrice = useMemo(
    () => cartItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0),
    [cartItems]
  );

  const totals = useMemo(
    () => calculateOrderTotals(itemsPrice, appliedCoupon?.discount || 0, shippingMethod),
    [itemsPrice, appliedCoupon, shippingMethod]
  );
  const totalPrice = totals.total;

  // ── Live offers + COD eligibility, both from the server ───────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/coupons/public");
        setAvailableCoupons(Array.isArray(data) ? data : []);
      } catch {
        /* offers are optional chrome */
      }
      try {
        const { data } = await api.post("/orders/quote", {
          subtotal: totals.total,
          postalCode: shippingAddress?.postalCode,
          shippingMethod,
        });
        setQuote(data);
      } catch {
        /* non-blocking */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingAddress?.postalCode, shippingMethod]);

  const codEligible = quote?.cod?.eligible !== false;

  // Default to prepaid when COD isn't available for this order.
  useEffect(() => {
    if (!codEligible) setPaymentMethod("Razorpay");
  }, [codEligible]);

  // ── Coupon ────────────────────────────────────────────────────────────────
  const applyCoupon = async (rawCode) => {
    const code = (rawCode ?? couponInput).trim().toUpperCase();
    if (!code) {
      setCouponError("Enter a coupon code");
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    try {
      // Send the cart so the server prices it from the database.
      const { data } = await api.post("/coupons/validate", {
        code,
        orderAmount: itemsPrice,
        orderItems: cartItems.map((i) => ({ product: i._id, qty: i.qty })),
      });

      const couponObj = {
        code: data.code || data.coupon?.code,
        description: data.description || data.coupon?.description,
        discount: data.discount ?? data.discountAmount ?? 0,
      };
      setAppliedCoupon(couponObj);
      writeJSON(KEYS.COUPON, couponObj);
      setCouponInput(data.code || data.coupon?.code || code);
      setShowCoupons(false);
      toast.success(`Coupon applied — you save ${formatPrice(data.discount ?? data.discountAmount ?? 0)}`);
    } catch (err) {
      setCouponError(
        err.response?.data?.message || err.friendlyMessage || "That coupon can't be applied"
      );
      setAppliedCoupon(null);
      removeRaw(KEYS.COUPON);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
    removeRaw(KEYS.COUPON);
  };

  const copyOrderSummary = async () => {
    const text = [
      `RK Saree Center — order`,
      ...cartItems.map(
        (i) => `${i.qty} × ${i.name}${i.size ? ` (${i.size})` : ""} — ${formatPrice(i.price * i.qty)}`
      ),
      `Total: ${formatPrice(totalPrice)}`,
      `Delivering to: ${shippingAddress?.city} ${shippingAddress?.postalCode}`,
      paymentMethod === "COD"
        ? `Payment: Cash on Delivery — keep ${formatPrice(totalPrice)} ready`
        : "Payment: online",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyState("Copied");
      setTimeout(() => setCopyState(""), 2000);
    } catch {
      toast("Couldn't copy — screenshot this instead");
    }
  };

  const requestCodOnWhatsApp = () => {
    const lines = [
      `Namaste! I'd like to place an order with RK Saree Center.`,
      "",
      ...cartItems.map((i) => `${i.qty} × ${i.name}${i.size ? ` (${i.size})` : ""}`),
      "",
      `Total: ${formatPrice(totalPrice)} (Cash on Delivery)`,
      `Deliver to: ${shippingAddress?.address}, ${shippingAddress?.city}, ${shippingAddress?.postalCode}`,
      shippingAddress?.phone ? `Phone: ${shippingAddress.phone}` : "",
    ].filter(Boolean);
    window.open(
      `https://wa.me/919708756854?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ── Place order ───────────────────────────────────────────────────────────
  const placeOrderHandler = async () => {
    if (outOfStockItems.length > 0) {
      toast.error("Some items are no longer available in that quantity");
      navigate("/cart");
      return;
    }
    if (paymentMethod === "COD" && !codEligible) {
      toast.error(quote?.cod?.reason || "Cash on Delivery isn't available for this order");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/orders", {
        orderItems: cartItems.map((item) => ({
          qty: item.qty,
          product: item._id,
          size: item.size || "",
          color: item.color || "",
        })),
        shippingAddress,
        paymentMethod,
        couponCode: appliedCoupon?.code || undefined,
        orderNotes: shippingAddress?.notes || "",
        isGift: Boolean(shippingAddress?.isGift),
        giftNote: shippingAddress?.giftNote || "",
        giftWrap: Boolean(shippingAddress?.giftWrap),
      });

      clearCart();
      removeRaw(KEYS.COUPON);

      if (paymentMethod === "COD") {
        navigate("/success", { state: { orderId: data._id, isCOD: true } });
      } else {
        navigate(`/payment/${data._id}`);
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.friendlyMessage ||
        "We couldn't place your order. Please try again.";
      toast.error(message);
      if (error.response?.data?.code === "OUT_OF_STOCK") {
        navigate("/cart");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!shippingAddress || cartItems.length === 0) return null;

  return (
    <>
      <Seo title="Review & Pay" description="Review your order and choose how to pay." url="/placeorder" noindex />

      <div className="min-h-screen bg-brand-bg py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <nav aria-label="Checkout progress" className="mb-8">
            <ol className="flex items-center justify-center gap-2">
              {STEPS.map((s, i) => {
                const state = i < 2 ? "done" : "current";
                return (
                  <li key={s} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <span
                        aria-current={state === "current" ? "step" : undefined}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          state === "done"
                            ? "bg-primary-600 text-white"
                            : "bg-primary-600 text-white ring-4 ring-primary-100"
                        }`}
                      >
                        {state === "done" ? <FiCheck className="w-4 h-4" aria-hidden="true" /> : i + 1}
                      </span>
                      <span className="text-[11px] sm:text-xs mt-1 font-medium text-primary-700">{s}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span aria-hidden="true" className="h-0.5 w-8 sm:w-16 mt-[-14px] mx-1 bg-primary-500" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            <div className="lg:col-span-3 space-y-5">
              {/* ── Delivery address ───────────────────────────────────────── */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-outfit font-bold text-gray-900 text-lg">Delivering to</h2>
                  <button
                    type="button"
                    onClick={() => navigate("/checkout")}
                    className="text-sm font-semibold text-primary-700 underline hover:text-primary-800 min-h-[44px] px-1"
                  >
                    Change
                  </button>
                </div>
                <address className="text-sm text-gray-700 not-italic leading-relaxed mt-2">
                  <p className="font-semibold text-gray-900">{shippingAddress.fullName}</p>
                  <p>{shippingAddress.address}</p>
                  {shippingAddress.landmark && <p className="text-gray-500">Near {shippingAddress.landmark}</p>}
                  <p>
                    {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                  </p>
                  <p className="text-gray-500 mt-1">📞 {shippingAddress.phone}</p>
                </address>

                {(shippingAddress.isGift || shippingAddress.giftWrap || shippingAddress.notes) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                    {shippingAddress.isGift && (
                      <p className="text-gray-700">
                        <FiGift className="w-4 h-4 text-pink-500 mr-1.5 inline" aria-hidden="true" />
                        <strong>Gift order.</strong> Prices hidden on the packing slip
                        {shippingAddress.giftWrap && ", gift wrapped"}.
                      </p>
                    )}
                    {shippingAddress.giftNote && (
                      <blockquote className="bg-pink-50 border-l-4 border-pink-300 p-3 rounded-r-lg italic text-gray-700">
                        “{shippingAddress.giftNote}”
                      </blockquote>
                    )}
                    {shippingAddress.notes && (
                      <p className="text-gray-600">
                        <strong>Instructions:</strong> {shippingAddress.notes}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* ── Payment method ─────────────────────────────────────────── */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 sm:p-6">
                <h2 className="font-outfit font-bold text-gray-900 text-lg mb-1">
                  How would you like to pay?
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  No advance payment needed if you choose Cash on Delivery.
                </p>

                <div className="space-y-2.5">
                  {/* COD first — it's the dominant and most trusted mode in
                      tier-2/3 India, and removing it costs ~34% of conversions. */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[60px] ${
                      paymentMethod === "COD"
                        ? "border-primary-500 bg-primary-50/50"
                        : codEligible
                          ? "border-gray-200 hover:border-gray-300"
                          : "border-gray-200 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === "COD"}
                      disabled={!codEligible}
                      onChange={() => setPaymentMethod("COD")}
                      className="mt-1 w-4 h-4 accent-primary-600 shrink-0"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="flex justify-between items-baseline gap-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          💵 Cash on Delivery
                        </span>
                        <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                          Keep {formatPrice(totalPrice)} ready
                        </span>
                      </span>
                      <span className="block text-xs text-gray-600 mt-1">
                        Pay the delivery agent in cash when your order arrives. We'll
                        WhatsApp you first to confirm — it helps us get it to you on time.
                      </span>
                      {!codEligible && (
                        <span className="block text-xs text-amber-800 font-medium mt-1.5">
                          {quote?.cod?.reason || "Not available for this order"}
                        </span>
                      )}
                    </span>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[60px] ${
                      paymentMethod === "Razorpay"
                        ? "border-primary-500 bg-primary-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Razorpay"
                      checked={paymentMethod === "Razorpay"}
                      onChange={() => setPaymentMethod("Razorpay")}
                      className="mt-1 w-4 h-4 accent-primary-600 shrink-0"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="flex justify-between items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm flex items-center gap-1.5 flex-wrap">
                          <span>🔒 Pay online (UPI / Cards)</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ⚡ Priority Dispatch
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                          {formatPrice(totalPrice)}
                        </span>
                      </span>
                      <span className="block text-xs text-gray-600 mt-1">
                        UPI, cards, net banking and wallets. Enjoy <strong>same-day priority dispatch</strong>, 100% contactless delivery, and instant refunds.
                      </span>
                    </span>
                  </label>
                </div>

                {/* Refund timeline next to the choice. Stating it here increases
                    prepaid conversion rather than deterring it. */}
                <p className="mt-3 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <FiAlertCircle className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
                  If you pay online and then return or cancel, we initiate the refund
                  within 24 hours. UPI refunds usually reach you within a further 24
                  hours.
                </p>

                <div className="mt-3">
                  <PaymentMarks />
                </div>
              </section>

              {/* ── Offers ────────────────────────────────────────────────── */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 sm:p-6">
                <h2 className="font-outfit font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
                  <FiTag className="w-5 h-5 text-accent-500" aria-hidden="true" />
                  Offers
                </h2>

                {appliedCoupon ? (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <FiCheck className="text-emerald-600 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-emerald-900 text-sm">
                        {appliedCoupon.code} applied
                      </p>
                      <p className="text-xs text-emerald-800">
                        You're saving {formatPrice(appliedCoupon.discount)}
                        {appliedCoupon.description ? ` — ${appliedCoupon.description}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="shrink-0 w-11 h-11 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 rounded-lg"
                      aria-label="Remove coupon"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <label htmlFor="coupon-code" className="sr-only">
                        Coupon code
                      </label>
                      <input
                        id="coupon-code"
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                        placeholder="Enter coupon code"
                        aria-invalid={Boolean(couponError)}
                        aria-describedby={couponError ? "coupon-error" : undefined}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm uppercase font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px]"
                      />
                      <button
                        type="button"
                        onClick={() => applyCoupon()}
                        disabled={couponLoading || !couponInput.trim()}
                        className="px-5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 disabled:opacity-50 min-h-[48px] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
                      >
                        {couponLoading ? <FiLoader className="w-4 h-4 animate-spin" aria-hidden="true" /> : "Apply"}
                      </button>
                    </div>
                    {couponError && (
                      <p id="coupon-error" role="alert" className="text-xs text-red-600 mt-2">
                        {couponError}
                      </p>
                    )}

                    {availableCoupons.length > 0 && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setShowCoupons((v) => !v)}
                          aria-expanded={showCoupons}
                          className="text-sm font-semibold text-primary-700 hover:text-primary-800 min-h-[44px]"
                        >
                          {showCoupons ? "Hide" : "Show"} {availableCoupons.length} available offer
                          {availableCoupons.length === 1 ? "" : "s"}
                        </button>
                        {showCoupons && (
                          <ul className="mt-2 space-y-2">
                            {availableCoupons.map((c) => (
                              <li key={c.code}>
                                <button
                                  type="button"
                                  onClick={() => applyCoupon(c.code)}
                                  className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-accent-300 bg-accent-50/50 hover:bg-accent-50 transition-colors min-h-[48px]"
                                >
                                  <span className="min-w-0">
                                    <span className="font-bold text-accent-700 text-sm">{c.code}</span>
                                    <span className="block text-xs text-gray-600 truncate">
                                      {c.description ||
                                        (c.discountType === "percentage"
                                          ? `${c.discountValue}% off`
                                          : `${formatPrice(c.discountValue)} off`)}
                                      {c.minOrderAmount > 0 && ` · min ${formatPrice(c.minOrderAmount)}`}
                                    </span>
                                  </span>
                                  <span className="text-xs font-semibold text-accent-700 whitespace-nowrap shrink-0">
                                    Apply
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>

            {/* ── Summary ─────────────────────────────────────────────────── */}
            <aside className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 sm:p-6 lg:sticky lg:top-24">
                <div className="flex items-center gap-2 mb-4">
                  <FiShoppingBag className="w-5 h-5 text-primary-600" aria-hidden="true" />
                  <h2 className="font-outfit font-bold text-gray-900 text-lg">Order summary</h2>
                </div>

                <ul className="space-y-3 max-h-52 overflow-y-auto pr-1 mb-4">
                  {cartItems.map((item) => (
                    <li key={item.cartKey} className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                        loading="lazy"
                        width={48}
                        height={48}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          Qty {item.qty}
                          {item.size && ` · ${item.size}`}
                          {item.color && ` · ${item.color}`}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                        {formatPrice(item.price * item.qty)}
                      </span>
                    </li>
                  ))}
                </ul>

                <dl className="border-t border-gray-100 pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <dt>Subtotal</dt>
                    <dd className="font-semibold">{formatPrice(totals.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <dt>{method.label}</dt>
                    <dd className={`font-semibold ${totals.shipping === 0 ? "text-emerald-700" : ""}`}>
                      {totals.shipping === 0 ? "FREE" : formatPrice(totals.shipping)}
                    </dd>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <dt>Discount {appliedCoupon && `(${appliedCoupon.code})`}</dt>
                      <dd className="font-semibold">− {formatPrice(totals.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-100">
                    <dt>Total</dt>
                    <dd>{formatPrice(totalPrice)}</dd>
                  </div>
                </dl>

                <DeliveryPromise
                  methodId={shippingMethod}
                  codAmount={paymentMethod === "COD" ? totalPrice : 0}
                  className="mt-4"
                />

                <button
                  type="button"
                  onClick={placeOrderHandler}
                  disabled={loading}
                  className="btn-shine w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 rounded-xl font-bold hover:shadow-brand active:scale-[.99] transition-all disabled:opacity-60 min-h-[52px] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
                >
                  {loading ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Placing your order…
                    </>
                  ) : (
                    <>
                      <FiLock className="w-4 h-4" aria-hidden="true" />
                      {paymentMethod === "COD"
                        ? `Place order — pay ${formatPrice(totalPrice)} on delivery`
                        : `Pay ${formatPrice(totalPrice)}`}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={copyOrderSummary}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 min-h-[44px]"
                >
                  <FiCopy className="w-3.5 h-3.5" aria-hidden="true" />
                  {copyState === "Copied" ? "Copied!" : "Copy order to send on WhatsApp"}
                </button>

                <button
                  type="button"
                  onClick={requestCodOnWhatsApp}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-800 hover:bg-emerald-100 min-h-[44px]"
                >
                  <FiMessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  Prefer to order on WhatsApp?
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 min-h-[44px]"
                >
                  <FiArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  Back to cart
                </button>
              </div>
            </aside>
          </div>

          <TrustBar variant="checkout" className="mt-8" />
        </div>
      </div>
    </>
  );
};

export default PlaceOrder;