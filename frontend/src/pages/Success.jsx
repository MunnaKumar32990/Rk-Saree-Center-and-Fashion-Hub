import { Link } from "react-router-dom";

const Success = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-md w-full text-center animate-scale-in">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce-subtle">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Order Placed Successfully!
          </h1>
          <p className="text-gray-600 text-lg mb-2">
            Thank you for shopping with
          </p>
          <p className="text-xl font-semibold text-gray-900">
            RK Saree & Fashion Hub
          </p>
        </div>

        <div className="space-y-4 mt-8">
          <p className="text-gray-700">
            Your order has been confirmed and will be processed shortly. You will receive an order confirmation email shortly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              to="/myorders"
              className="flex-1 bg-gradient-to-r from-purple-700 to-violet-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
            >
              View Orders
            </Link>
            <Link
              to="/"
              className="flex-1 bg-gray-100 text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 border-2 border-gray-300"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
