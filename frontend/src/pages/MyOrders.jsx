import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/orders/myorders", {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        setOrders(data);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userInfo && userInfo.token) {
      fetchOrders();
    }
  }, [userInfo?.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 animate-fade-in">My Orders</h2>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center animate-fade-in">
            <div className="mb-6">
              <svg
                className="mx-auto h-20 w-20 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {orders.map((order, index) => (
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50 transition-colors duration-200 animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="p-4">
                        <Link
                          to={`/order/${order._id}`}
                          className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          {order._id.substring(0, 8)}...
                        </Link>
                      </td>
                      <td className="p-4 text-center text-sm text-gray-600">
                        {new Date(order.createdAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center font-semibold text-gray-900">
                        ₹{order.totalPrice.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {order.isPaid ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            ✓ Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            ✗ Unpaid
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {order.isDelivered ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            ✓ Delivered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            ⏳ Processing
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          to={`/order/${order._id}`}
                          className="inline-block bg-gradient-to-r from-purple-700 to-violet-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;