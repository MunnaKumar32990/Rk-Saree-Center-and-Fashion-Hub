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
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      <table className="w-full bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3">Order ID</th>
            <th className="p-3">User</th>
            <th className="p-3">Total</th>
            <th className="p-3">Paid</th>
            <th className="p-3">Delivered</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr key={order._id} className="border-t text-center">
              <td className="p-3 text-sm">{order._id}</td>
              <td className="p-3">{order.user?.name}</td>
              <td className="p-3">₹{order.totalPrice}</td>
              <td className="p-3">
                {order.isPaid ? "✅" : "❌"}
              </td>
              <td className="p-3">
                {order.isDelivered ? "✅" : "❌"}
              </td>
              <td className="p-3">
                {!order.isDelivered && (
                  <button
                    onClick={() => markDelivered(order._id)}
                    className="text-green-600 hover:underline"
                  >
                    Mark Delivered
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  );
};

export default AdminOrders;
