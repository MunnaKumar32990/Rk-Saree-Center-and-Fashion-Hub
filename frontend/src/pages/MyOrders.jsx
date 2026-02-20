import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { PageLoader } from "../components/Loader";
import { FiPackage, FiChevronRight, FiClock } from "react-icons/fi";

const STATUS_COLORS = {
  Processing: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Shipped: "bg-indigo-100 text-indigo-700",
  "Out for Delivery": "bg-purple-100 text-purple-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders/myorders")
      .then(({ data }) => setOrders(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader text="Loading your orders..." />;

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="bg-gradient-to-r from-brand-dark to-primary-900 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <FiPackage className="w-6 h-6 text-primary-300" />
          <h1 className="font-outfit text-3xl font-bold text-white">My Orders</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">📦</div>
            <h2 className="font-outfit text-2xl font-bold text-gray-800 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">Your orders will appear here after checkout</p>
            <Link to="/category/Women" className="inline-block bg-primary-600 text-white font-bold px-8 py-3 rounded-2xl hover:bg-primary-700 transition-all">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden hover:border-primary-200 transition-all">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Order ID</p>
                    <p className="font-mono text-sm font-bold text-gray-800">#{order._id.slice(-10).toUpperCase()}</p>
                  </div>
                  <div className="text-right sm:text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Placed on</p>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Total</p>
                    <p className="font-outfit font-bold text-gray-900">₹{order.totalPrice?.toLocaleString("en-IN")}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}>
                    {order.status}
                  </span>
                </div>

                {/* Items preview */}
                <div className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex gap-2 overflow-x-auto">
                    {order.orderItems?.slice(0, 3).map((item, i) => (
                      <img
                        key={i}
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-14 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                      />
                    ))}
                    {order.orderItems?.length > 3 && (
                      <div className="w-12 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-semibold flex-shrink-0">
                        +{order.orderItems.length - 3}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/order/${order._id}`}
                    className="flex items-center gap-1.5 text-primary-600 font-semibold text-sm hover:text-primary-700 flex-shrink-0"
                  >
                    View Details <FiChevronRight />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;