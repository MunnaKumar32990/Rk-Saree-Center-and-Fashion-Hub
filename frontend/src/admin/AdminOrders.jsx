import { useEffect, useState } from "react";
import api from "../services/api";
import AdminLayout from "./AdminLayout";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  const fetchOrders = async () => {
    const { data } = await api.get("/orders", {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    });
    setOrders(data);
  };

  const markDelivered = async (id) => {
    await api.put(
      `/orders/${id}/deliver`,
      {},
      {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      }
    );
    fetchOrders();
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Orders Management</h1>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Order ID</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">User</th>
                  <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Total</th>
                  <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Payment</th>
                  <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-gray-500">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order, index) => (
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50 transition-colors duration-200 animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="p-4">
                        <span className="font-mono text-sm text-gray-900">
                          {order._id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="p-4 font-medium text-gray-900">{order.user?.name || 'N/A'}</td>
                      <td className="p-4 text-center font-semibold text-gray-900">₹{order.totalPrice.toLocaleString()}</td>
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
                        {!order.isDelivered && (
                          <button
                            onClick={() => markDelivered(order._id)}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-all duration-300 hover:scale-105 active:scale-95"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
