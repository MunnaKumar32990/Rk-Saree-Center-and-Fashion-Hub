import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom"; // Link is already imported here

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.get("/orders/myorders", {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        setOrders(data);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    if (userInfo && userInfo.token) {
      fetchOrders();
    }
  }, [userInfo.token]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-6">My Orders</h2>

      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow rounded border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Order ID</th>
              <th className="p-3 text-center">Total</th>
              <th className="p-3 text-center">Paid</th>
              <th className="p-3 text-center">Delivered</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-t hover:bg-gray-50 transition">
                {/* --- UPDATED ORDER ID CELL --- */}
                <td className="p-3 text-sm text-blue-600 hover:underline">
                  <Link to={`/order/${order._id}`}>
                    {order._id}
                  </Link>
                </td>
                
                <td className="p-3 text-center font-medium">₹{order.totalPrice}</td>
                <td className="p-3 text-center text-xl">
                  {order.isPaid ? "✅" : "❌"}
                </td>
                <td className="p-3 text-center text-xl">
                  {order.isDelivered ? "✅" : "❌"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyOrders;