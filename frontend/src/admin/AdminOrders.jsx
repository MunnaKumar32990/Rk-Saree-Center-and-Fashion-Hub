import { useEffect, useState } from "react";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import toast from "react-hot-toast";
import { FiSearch, FiRefreshCw } from "react-icons/fi";

const STATUS_CONFIG = {
  Processing: { color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  Confirmed: { color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  Shipped: { color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  "Out for Delivery": { color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  Delivered: { color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  Cancelled: { color: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

const NEXT_STATUSES = {
  Processing: ["Confirmed", "Cancelled"],
  Confirmed: ["Shipped", "Cancelled"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/orders?limit=200");
      // API returns { orders: [...], page, pages } — extract the array
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (err) {
      toast.error("Failed to load orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.put(`/orders/${id}/status`, { status });
      toast.success(`Status updated to ${status}`);
      fetchOrders();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter((o) =>
    o._id?.toLowerCase().includes(search.toLowerCase()) ||
    o.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-0.5">{orders.length} total orders</p>
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm"
          >
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Order ID or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading orders...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-16 text-center text-gray-400">
                        <p className="text-4xl mb-3">📦</p>
                        <p>No orders found.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((order) => {
                      const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Processing;
                      const nextStatuses = NEXT_STATUSES[order.status] || [];
                      return (
                        <tr key={order._id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-4">
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                              #{order._id?.slice(-8).toUpperCase()}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-gray-900 text-sm">{order.user?.name || "Guest"}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[140px]">{order.user?.email}</p>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center -space-x-2">
                              {order.orderItems?.slice(0, 2).map((item, i) => (
                                <img key={i} src={item.image} alt={item.name}
                                  className="w-8 h-10 rounded-md object-cover border-2 border-white shadow-sm" />
                              ))}
                              {order.orderItems?.length > 2 && (
                                <div className="w-8 h-10 rounded-md bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-bold">
                                  +{order.orderItems.length - 2}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-outfit font-bold text-gray-900">
                              ₹{order.totalPrice?.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {order.isPaid ? (
                              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">✓ Paid</span>
                            ) : (
                              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">✗ Unpaid</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {nextStatuses.length > 0 ? (
                              <div className="flex flex-col gap-1.5 items-center">
                                {nextStatuses.map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => updateStatus(order._id, s)}
                                    disabled={updating === order._id}
                                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors w-full max-w-[130px] ${s === "Cancelled"
                                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                                        : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                                      } disabled:opacity-50`}
                                  >
                                    {updating === order._id ? "..." : `→ ${s}`}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
