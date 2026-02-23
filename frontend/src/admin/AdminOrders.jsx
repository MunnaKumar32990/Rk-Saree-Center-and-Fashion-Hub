import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import toast from "react-hot-toast";
import {
  FiSearch, FiRefreshCw, FiDownload, FiFilter,
  FiCheckSquare, FiX, FiChevronLeft, FiChevronRight,
  FiPackage, FiDollarSign, FiClock, FiXCircle
} from "react-icons/fi";

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "Pending Payment": { color: "bg-orange-100 text-orange-700", dot: "bg-orange-400" },
  Paid: { color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  Confirmed: { color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  Packed: { color: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  Shipped: { color: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500" },
  "Out for Delivery": { color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  Delivered: { color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  Returned: { color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  Refunded: { color: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
  Cancelled: { color: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

const ALL_STATUSES = [
  "Pending Payment", "Paid", "Confirmed", "Packed",
  "Shipped", "Out for Delivery", "Delivered",
  "Returned", "Refunded", "Cancelled",
];

// ─── Mini Stat Card ───────────────────────────────────────────────────────────
const MiniStat = ({ icon: Icon, label, value, color }) => (
  <div className={`flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3`}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="font-outfit font-bold text-gray-900 text-sm">{value}</p>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const AdminOrders = () => {
  const navigate = useNavigate();

  // Data
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Bulk
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (p = page) => {
    try {
      setLoading(true);
      setSelected([]);
      const params = new URLSearchParams({
        page: p,
        limit,
        ...(search && { search }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterPayment && { paymentStatus: filterPayment }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice }),
      });
      const { data } = await api.get(`/orders?${params}`);
      setOrders(Array.isArray(data) ? data : data.orders || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterStatus, filterPayment, dateFrom, dateTo, minPrice, maxPrice]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/orders/stats");
      setStats(data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchOrders(1); setPage(1); }, [limit, filterStatus, filterPayment, dateFrom, dateTo, minPrice, maxPrice]);
  useEffect(() => { fetchStats(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders(1);
    setPage(1);
  };

  const goToPage = (p) => {
    setPage(p);
    fetchOrders(p);
  };

  // ─── Bulk ────────────────────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelected(selected.length === orders.length ? [] : orders.map((o) => o._id));

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selected.length === 0) return;
    setBulkLoading(true);
    try {
      const { data } = await api.put("/orders/bulk-status", { orderIds: selected, status: bulkStatus });
      toast.success(data.message);
      fetchOrders(page);
      setBulkStatus("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk update failed");
    } finally {
      setBulkLoading(false);
    }
  };

  // ─── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = async () => {
    try {
      const params = new URLSearchParams({
        ...(filterStatus && { status: filterStatus }),
        ...(filterPayment && { paymentStatus: filterPayment }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice }),
      });
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      const res = await fetch(`/api/orders/export-csv?${params}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported!");
    } catch {
      toast.error("Export failed");
    }
  };

  const clearFilters = () => {
    setFilterStatus("");
    setFilterPayment("");
    setDateFrom("");
    setDateTo("");
    setMinPrice("");
    setMaxPrice("");
    setSearch("");
  };

  const hasFilters = filterStatus || filterPayment || dateFrom || dateTo || minPrice || maxPrice || search;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total orders</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={exportCSV}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all">
              <FiDownload className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => { fetchOrders(page); fetchStats(); }}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm">
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* ── Mini Stats ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat icon={FiPackage} label="Today's Orders" value={stats.todayOrders || 0} color="bg-blue-500" />
            <MiniStat icon={FiDollarSign} label="Today's Revenue" value={`₹${(stats.todayRevenue || 0).toLocaleString("en-IN")}`} color="bg-emerald-500" />
            <MiniStat icon={FiClock} label="Pending Orders" value={stats.pendingOrders || 0} color="bg-orange-500" />
            <MiniStat icon={FiXCircle} label="Cancelled" value={stats.cancelledOrders || 0} color="bg-red-500" />
          </div>
        )}

        {/* ── Search + Filter Toggle ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by Order ID or customer name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
                />
              </div>
              <button type="submit"
                className="px-4 py-2.5 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all">
                Search
              </button>
            </form>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all ${showFilters ? "bg-primary-50 border-primary-300 text-primary-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              <FiFilter className="w-4 h-4" />
              Filters {hasFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
            </button>
            {hasFilters && (
              <button onClick={clearFilters}
                className="px-3 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-all">
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ── Filter Panel ── */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Order Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50">
                  <option value="">All Statuses</option>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Payment */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Payment Status</label>
                <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50">
                  <option value="">All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              {/* Date From */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50" />
              </div>
              {/* Date To */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50" />
              </div>
              {/* Price Min */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Min Price (₹)</label>
                <input type="number" placeholder="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50" />
              </div>
              {/* Price Max */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Max Price (₹)</label>
                <input type="number" placeholder="99999" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50" />
              </div>
            </div>
          )}
        </div>

        {/* ── Bulk Action Bar ── */}
        {selected.length > 0 && (
          <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-2xl px-5 py-3 flex-wrap">
            <span className="text-sm font-semibold text-primary-700">
              {selected.length} order{selected.length > 1 ? "s" : ""} selected
            </span>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
              className="border border-primary-300 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white text-gray-700">
              <option value="">Change status to...</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={handleBulkUpdate} disabled={!bulkStatus || bulkLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all disabled:opacity-50">
              {bulkLoading ? "Updating..." : "Apply"}
            </button>
            <button onClick={() => setSelected([])}
              className="ml-auto text-gray-500 hover:text-gray-700 text-sm font-medium">
              Clear selection
            </button>
          </div>
        )}

        {/* ── Table ── */}
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
                    <th className="p-4 w-10">
                      <input type="checkbox"
                        checked={selected.length === orders.length && orders.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded accent-primary-600 cursor-pointer" />
                    </th>
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-16 text-center text-gray-400">
                        <p className="text-4xl mb-3">📦</p>
                        <p>No orders found.</p>
                        {hasFilters && (
                          <button onClick={clearFilters} className="mt-3 text-primary-600 font-semibold text-sm underline">
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["Pending Payment"];
                      return (
                        <tr
                          key={order._id}
                          onClick={(e) => {
                            if (e.target.type === "checkbox") return;
                            navigate(`/admin/orders/${order._id}`);
                          }}
                          className={`hover:bg-primary-50/40 transition-colors cursor-pointer ${selected.includes(order._id) ? "bg-primary-50/30" : ""}`}
                        >
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.includes(order._id)}
                              onChange={() => toggleSelect(order._id)}
                              className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                              #{order._id?.slice(-8).toUpperCase()}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
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
                                  className="w-8 h-10 rounded-md object-cover border-2 border-white shadow-sm"
                                  onError={(e) => { e.target.src = "https://placehold.co/40x50"; }} />
                              ))}
                              {order.orderItems?.length > 2 && (
                                <div className="w-8 h-10 rounded-md bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-bold">
                                  +{order.orderItems.length - 2}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{order.orderItems?.length} item{order.orderItems?.length !== 1 ? "s" : ""}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-outfit font-bold text-gray-900">
                              ₹{order.totalPrice?.toLocaleString("en-IN")}
                            </span>
                            {order.couponCode && (
                              <p className="text-xs text-emerald-600 font-medium mt-0.5">{order.couponCode}</p>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {order.isPaid ? (
                              <div>
                                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">✓ Paid</span>
                                <p className="text-xs text-gray-400 mt-0.5">{order.paymentMethod}</p>
                              </div>
                            ) : (
                              <div>
                                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">✗ Unpaid</span>
                                <p className="text-xs text-gray-400 mt-0.5">{order.paymentMethod}</p>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {order.status}
                            </span>
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

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Rows per page:</span>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none bg-white">
                {[10, 20, 50, 100].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500 mr-2">
                Page {page} of {pages} ({total} total)
              </span>
              <button disabled={page <= 1} onClick={() => goToPage(page - 1)}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all">
                <FiChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                let p;
                if (pages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= pages - 2) p = pages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button key={p} onClick={() => goToPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${p === page ? "bg-primary-600 text-white shadow-sm" : "border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                    {p}
                  </button>
                );
              })}
              <button disabled={page >= pages} onClick={() => goToPage(page + 1)}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all">
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
