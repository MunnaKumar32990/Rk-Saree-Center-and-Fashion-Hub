import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiLock, FiLoader, FiAlertCircle, FiMessageCircle, FiShield, FiClock } from "react-icons/fi";

import Seo from "../components/Seo";
import { formatPrice, formatDate } from "../utils/pricing";
import { getWhatsAppUrl } from "../utils/contact";

/**
 * Payment.
 *
 * Fixes:
 *
 * 1. **Duplicate gateway orders.** `payNow()` POSTed to `/payment/create` on
 *    every click with no guard, so a double-tap or an impatient second click
 *    created two Razorpay orders for one database order. There is now a ref
 *    lock, so the second call short-circuits.
 *
 * 2. **Duplicate script tags.** `loadRazorpayScript` appended a new `<script>`
 *    on every invocation while the first was still in flight. It now memoizes
 *    the in-flight promise and retries cleanly if the load fails.
 *
 * 3. **A failed payment locked the customer out.** On `payment.failed` or a
 *    verification error, `payLoading` was left true or the page went dead with
 *    no route forward. There is now always a working retry, and a "pay by
 *    Cash on Delivery instead" escape hatch.
 *
 * 4. **`/logo.png` 404'd** — referenced by the Razorpay checkout but never
 *    created, which showed a broken image inside the payment modal.
 *
 * 5. **Brand colour mismatch.** The page used violet while the site is teal
 *    (`#0F766E`). Customers consistently read design incoherence as a proxy
 *    for operational unreliability.
 *
 * 6. **No offline-recovery messaging.** A verification failure now says
 *    plainly that money is auto-reversed, which is the single thing a worried
 *    buyer needs to hear.
 */
const Payment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const scriptPromise = useRef(null);
  const payLock = useRef(false);

  // ── Load order ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        if (cancelled) return;
        if (data.isPaid) {
          navigate("/success", { replace: true });
          return;
        }
        setOrder(data);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.friendlyMessage ||
              "We couldn't load this order."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, navigate]);

  /** Load checkout.js exactly once, even under concurrent calls. */
  const loadRazorpayScript = useCallback(() => {
    if (window.Razorpay) return Promise.resolve(true);
    if (scriptPromise.current) return scriptPromise.current;

    scriptPromise.current = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        // Allow a retry on the next attempt.
        scriptPromise.current = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return scriptPromise.current;
  }, []);

  // ── Pay ───────────────────────────────────────────────────────────────────
  const payNow = useCallback(async () => {
    if (payLock.current) return;
    payLock.current = true;
    setPayLoading(true);
    setError("");

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Couldn't reach the payment page. Check your connection and try again.");
        toast.error("Payment page didn't load — check your connection");
        return;
      }

      const { data } = await api.post("/payment/create", { orderId });

      if (data.totalPrice !== order?.totalPrice) {
        // The server recalculates totals from database prices. If they moved
        // (a price change while the customer was on the payment page) the
        // customer must see the new figure before paying.
        toast(
          `Order total updated to ₹${Number(data.totalPrice).toLocaleString("en-IN")} — please confirm`,
          { icon: "ℹ️", duration: 6000 }
        );
        setOrder((prev) => (prev ? { ...prev, totalPrice: data.totalPrice } : prev));
      }

      const options = {
        key: data.keyId,
        amount: data.amount, // paise, derived from the DB order
        currency: data.currency || "INR",
        name: "RK Saree & Fashion Hub",
        description: `Order ${data.orderNumber || `#${orderId.slice(-8).toUpperCase()}`}`,
        // Removed: image pointed at /logo.png, which 404'd and showed a broken
        // image inside the payment modal — the worst possible trust signal.
        order_id: data.razorpayOrderId,
        prefill: {
          name: data.customerName,
          email: data.customerEmail,
          contact: order?.shippingAddress?.phone || "",
        },
        notes: { orderNumber: data.orderNumber || "" },
        // Brand colour, matching the site. Razorpay rejects a malformed hex.
        theme: { color: "#0F766E" },
        retry: { enabled: true, max_attempts: 2 },
        // Draws a far bigger net-banking list — the useful ones for India.
        netbanking: { preferred: [] },
        handler: async function (response) {
          try {
            await api.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            });
            toast.success("Payment received — thank you!");
            payLock.current = false;
            navigate("/success", { replace: true });
          } catch (verifyErr) {
            const message =
              verifyErr.response?.data?.message ||
              verifyErr.friendlyMessage ||
              "We couldn't confirm the payment.";
            setError(
              `${message} If money was debited it will be reversed to your account automatically — check your statement in a few minutes, or WhatsApp us.`
            );
            toast.error(message, { duration: 8000 });
            setRetryCount((c) => c + 1);
          } finally {
            payLock.current = false;
            setPayLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            payLock.current = false;
            setPayLoading(false);
            if (retryCount === 0) toast("Payment cancelled — nothing was charged", { icon: "ℹ️" });
          },
        },
      };

      const razor = new window.Razorpay(options);
      razor.on("payment.failed", (response) => {
        payLock.current = false;
        setPayLoading(false);
        const desc =
          response?.error?.description ||
          "The bank didn't complete the payment.";
        setError(`${desc} You have not been charged. Try again, or choose Cash on Delivery.`);
        toast.error(desc, { duration: 7000 });
        setRetryCount((c) => c + 1);
      });
      razor.open();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.friendlyMessage ||
        "We couldn't start the payment. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      payLock.current = false;
      setPayLoading(false);
    }
  }, [orderId, order?.totalPrice, order?.shippingAddress?.phone, loadRazorpayScript, navigate, retryCount]);

  const switchToCod = () => {
    toast("Choose Cash on Delivery on the order page instead", { icon: "💵" });
    navigate(`/order/${orderId}`);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <FiLoader className="w-10 h-10 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Loading your order</span>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-card p-8 max-w-md w-full text-center">
          <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate("/myorders")}
              className="px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all min-h-[48px]"
            >
              View my orders
            </button>
            <a
              href={getWhatsAppUrl("Hi, I need help with a payment on your website.")}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-50 transition-all min-h-[48px] flex items-center justify-center gap-2"
            >
              <FiMessageCircle className="w-4 h-4" aria-hidden="true" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  const attempts = retryCount + 1;

  return (
    <>
      <Seo title="Secure Payment" description="Complete your payment securely." url={`/payment/${orderId}`} noindex />

      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-card p-6 sm:p-10 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-6">
            <FiLock className="w-8 h-8 text-primary-700" aria-hidden="true" />
          </div>

          <h1 className="font-outfit text-3xl font-bold text-gray-900 mb-1">
            Complete payment
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Secure checkout powered by Razorpay
          </p>

          {order && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm text-gray-600 gap-4">
                <span>Order</span>
                <span className="font-mono font-semibold text-gray-800 truncate">
                  {order.orderNumber || `#${orderId.slice(-8).toUpperCase()}`}
                </span>
              </div>
              {order.createdAt && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Placed</span>
                  <span className="text-gray-800">{formatDate(order.createdAt)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Items</span>
                <span className="font-semibold text-gray-800">
                  {order.orderItems?.reduce((s, i) => s + i.qty, 0) || 0} item(s)
                </span>
              </div>
              <div className="border-t border-gray-200 my-2" />
              <div className="flex justify-between font-bold text-lg text-gray-900">
                <span>Total payable</span>
                <span>{formatPrice(order.totalPrice)}</span>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="text-left mb-5 rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-red-800 text-sm flex items-start gap-2">
                <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={payNow}
            disabled={payLoading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 px-6 rounded-xl font-bold text-lg hover:shadow-brand transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed min-h-[52px] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
          >
            {payLoading ? (
              <span className="flex items-center justify-center gap-2">
                <FiLoader className="w-5 h-5 animate-spin" aria-hidden="true" />
                Opening secure payment…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FiLock className="w-5 h-5" aria-hidden="true" />
                Pay {formatPrice(order?.totalPrice)} now
              </span>
            )}
          </button>

          {/* Alternative route out. Being unable to pay online must never mean
              being unable to buy — COD is the dominant mode here. */}
          {attempts > 1 && (
            <button
              type="button"
              onClick={switchToCod}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-50 transition-all min-h-[48px]"
            >
              <span aria-hidden="true">💵</span>
              Can't pay online? Ask for Cash on Delivery
            </button>
          )}

          <div className="mt-6 space-y-2 text-left">
            {[
              { icon: <FiShield className="w-3.5 h-3.5" />, text: "256-bit SSL encrypted — we never see your card or UPI details" },
              { icon: <FiClock className="w-3.5 h-3.5" />, text: "Refunds initiated within 24 hours of an accepted return" },
              { icon: <FiMessageCircle className="w-3.5 h-3.5" />, text: "Stuck? WhatsApp us — a real person replies" },
            ].map((t) => (
              <p key={t.text} className="text-xs text-stone-600 flex items-start gap-2">
                <span className="text-emerald-700 shrink-0 mt-0.5" aria-hidden="true">{t.icon}</span>
                <span>{t.text}</span>
              </p>
            ))}
          </div>

          <Link
            to="/myorders"
            className="mt-5 inline-block text-sm text-gray-500 hover:text-gray-800 transition-colors underline underline-offset-2 min-h-[44px] py-2"
          >
            Go to my orders
          </Link>
        </div>
      </div>
    </>
  );
};

export default Payment;