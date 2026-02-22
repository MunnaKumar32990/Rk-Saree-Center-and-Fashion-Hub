import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiLock, FiLoader, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

const Payment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Load order details ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        if (data.isPaid) {
          navigate("/success", { replace: true });
          return;
        }
        setOrder(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load order details.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, navigate]);

  // ── Load Razorpay script dynamically ───────────────────────────────────
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // ── Initiate payment ───────────────────────────────────────────────────
  const payNow = async () => {
    setPayLoading(true);
    setError("");
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay. Check your internet connection.");
        setPayLoading(false);
        return;
      }

      // Create Razorpay order on backend (gets real amount from DB)
      const { data } = await api.post("/payment/create", { orderId });

      const options = {
        key: data.keyId,                    // from backend env
        amount: data.amount,               // in paise, from DB order total
        currency: data.currency,
        name: "RK Saree & Fashion Hub",
        description: `Order #${orderId.slice(-8).toUpperCase()}`,
        image: "/logo.png",
        order_id: data.razorpayOrderId,
        prefill: {
          name: data.customerName,
          email: data.customerEmail,
        },
        theme: { color: "#7c3aed" },

        handler: async function (response) {
          try {
            // Verify payment signature on backend
            await api.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            });
            toast.success("Payment successful! 🎉");
            navigate("/success", { replace: true });
          } catch (verifyErr) {
            toast.error(verifyErr.response?.data?.message || "Payment verification failed. Contact support.");
          }
        },

        modal: {
          ondismiss: () => {
            toast("Payment cancelled.", { icon: "⚠️" });
            setPayLoading(false);
          },
        },
      };

      const razor = new window.Razorpay(options);
      razor.on("payment.failed", (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setPayLoading(false);
      });
      razor.open();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to initiate payment. Please try again.";
      setError(msg);
      toast.error(msg);
      setPayLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FiLoader className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate("/myorders")}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all"
          >
            View My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-md w-full text-center">

        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mb-6">
          <FiLock className="w-8 h-8 text-violet-600" />
        </div>

        <h2 className="font-outfit text-3xl font-bold text-gray-900 mb-1">Complete Payment</h2>
        <p className="text-gray-500 text-sm mb-8">Secure payment powered by Razorpay</p>

        {/* Order summary */}
        {order && (
          <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Order ID</span>
              <span className="font-mono font-semibold text-gray-800">#{orderId.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Items</span>
              <span className="font-semibold text-gray-800">{order.orderItems?.length} item(s)</span>
            </div>
            <div className="border-t border-gray-200 my-2" />
            <div className="flex justify-between font-bold text-lg text-gray-900">
              <span>Total</span>
              <span>₹{order.totalPrice?.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm mb-4 flex items-center justify-center gap-1.5">
            <FiAlertCircle className="w-4 h-4" /> {error}
          </p>
        )}

        <button
          onClick={payNow}
          disabled={payLoading}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-violet-500 hover:to-purple-600 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {payLoading ? (
            <span className="flex items-center justify-center gap-2">
              <FiLoader className="w-5 h-5 animate-spin" />
              Opening Razorpay...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <FiLock className="w-5 h-5" />
              Pay ₹{order?.totalPrice?.toLocaleString("en-IN")} Now
            </span>
          )}
        </button>

        <div className="mt-6 space-y-1.5">
          {["🔒 256-bit SSL encrypted", "✅ Razorpay verified gateway", "💳 UPI, Cards, Net Banking accepted"].map(t => (
            <p key={t} className="text-xs text-gray-400">{t}</p>
          ))}
        </div>

        <button
          onClick={() => navigate("/myorders")}
          className="mt-5 text-sm text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
        >
          Go to My Orders
        </button>
      </div>
    </div>
  );
};

export default Payment;
