import { useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

const Payment = () => {
  const { orderId } = useParams();
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const [loading, setLoading] = useState(false);

  const payNow = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(
        "/payment/create",
        { amount: 100 }, // example
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      const options = {
        key: "RAZORPAY_KEY_ID",
        amount: data.amount,
        currency: "INR",
        order_id: data.id,
        handler: async function (response) {
          await api.post(
            "/payment/verify",
            {
              ...response,
              orderId,
            },
            {
              headers: {
                Authorization: `Bearer ${userInfo.token}`,
              },
            }
          );
          window.location.href = "/success";
        },
      };

      const razor = new window.Razorpay(options);
      razor.open();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-md w-full text-center animate-fade-in">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h2>
          <p className="text-gray-600">Secure payment powered by Razorpay</p>
        </div>

        <button
          onClick={payNow}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-700 to-violet-700 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              Processing...
            </span>
          ) : (
            "Pay Now"
          )}
        </button>

        <p className="text-xs text-gray-500 mt-6">
          Your payment information is secure and encrypted
        </p>
      </div>
    </div>
  );
};

export default Payment;
