import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import toast from "react-hot-toast";
import {
  FiSearch, FiRefreshCw, FiDownload, FiFilter,
  FiCheckSquare, FiX, FiChevronLeft, FiChevronRight,
  FiPackage, FiDollarSign, FiClock, FiXCircle, FiPrinter
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

  // Dispatch Manifest
  const [showManifest, setShowManifest] = useState(false);
  const [manifestCourier, setManifestCourier] = useState("All");

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

  // fetchOrders is recreated whenever `search` or `page` changes, but the effect
  // below must only fire for the filter inputs: search is applied on submit
  // (not on every keystroke) and page is driven by goToPage. Reading the latest
  // callback through a ref keeps the closure fresh without widening the
  // dependency array and re-fetching on each keystroke.
  const fetchOrdersRef = useRef(fetchOrders);
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders;
  }, [fetchOrders]);

  useEffect(() => { fetchOrdersRef.current(1); setPage(1); }, [limit, filterStatus, filterPayment, dateFrom, dateTo, minPrice, maxPrice]);
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
      const res = await api.get(`/orders/export-csv?${params}`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
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
            <button
              onClick={() => setShowManifest(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
              title="Generate printable courier dispatch manifest"
            >
              <FiPrinter className="w-4 h-4" /> Courier Manifest {selected.length > 0 && `(${selected.length})`}
            </button>
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
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">RTO Risk</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-16 text-center text-gray-400">
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
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {order.rtoRisk?.level === "HIGH" ? (
                              <span
                                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200"
                                title={order.rtoRisk.reasons?.join(" • ")}
                              >
                                ⚠️ High Risk
                              </span>
                            ) : order.rtoRisk?.level === "MEDIUM" ? (
                              <span
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200"
                                title={order.rtoRisk.reasons?.join(" • ")}
                              >
                                ⚡ Medium
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700"
                                title={order.rtoRisk?.reasons?.join(" • ") || "Safe"}
                              >
                                ✓ Low
                              </span>
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

        {/* ── Courier Dispatch Manifest Modal ── */}
        {showManifest && (() => {
          const candidateOrders = selected.length > 0
            ? orders.filter((o) => selected.includes(o._id))
            : orders.filter((o) => ["Packed", "Shipped", "Confirmed"].includes(o.status));
          const list = candidateOrders.length > 0 ? candidateOrders : orders;
          const filteredList = manifestCourier === "All"
            ? list
            : list.filter((o) => (o.courierName || "Unassigned").toLowerCase().includes(manifestCourier.toLowerCase()));
          const totalCodAmount = filteredList
            .filter((o) => o.paymentMethod === "COD")
            .reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);
          const codCount = filteredList.filter((o) => o.paymentMethod === "COD").length;
          const prepaidCount = filteredList.length - codCount;
          const dateStr = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          const timeStr = new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
              <style>{`
                @media print {
                  body * { visibility: hidden !important; }
                  #manifest-print-sheet, #manifest-print-sheet * { visibility: visible !important; }
                  #manifest-print-sheet {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 12px !important;
                    background: white !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  .no-print { display: none !important; }
                }
              `}</style>
              <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
                {/* Modal Toolbar (hidden on print) */}
                <div className="no-print p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <FiPrinter className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-outfit font-bold text-gray-900 text-base">
                      Daily Courier Dispatch &amp; Handover Manifest
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span>Courier:</span>
                      <select
                        value={manifestCourier}
                        onChange={(e) => setManifestCourier(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                      >
                        <option value="All">All Couriers ({list.length})</option>
                        <option value="Delhivery">Delhivery</option>
                        <option value="Blue Dart">Blue Dart</option>
                        <option value="DTDC">DTDC</option>
                        <option value="India Post">India Post (Speed Post)</option>
                        <option value="Ekart">Ekart</option>
                        <option value="Shiprocket">Shiprocket</option>
                      </select>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all"
                    >
                      <FiPrinter className="w-4 h-4" /> Print Sheet (A4)
                    </button>
                    <button
                      onClick={() => setShowManifest(false)}
                      className="p-2 text-gray-500 hover:text-gray-800 rounded-lg"
                      aria-label="Close manifest"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Printable Manifest Sheet */}
                <div id="manifest-print-sheet" className="p-6 sm:p-8 overflow-y-auto flex-1 text-gray-900">
                  {/* Business Header */}
                  <div className="border-b-2 border-gray-900 pb-4 mb-4 flex justify-between items-start gap-4">
                    <div>
                      <h1 className="font-outfit font-black text-2xl tracking-wide uppercase text-gray-900">
                        RK Saree Center &amp; Fashion Hub
                      </h1>
                      <p className="text-xs text-gray-600 font-medium mt-0.5">
                        Main Market, Ramgarhwa, Motihari, Bihar – 845433 | Contact: +91 97087 56854
                      </p>
                      <p className="text-xs font-bold text-indigo-700 tracking-wider uppercase mt-1">
                        Daily Outbound Shipment Dispatch Manifest
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-mono text-gray-500 font-bold">DATE: {dateStr}</p>
                      <p className="font-mono text-gray-500">TIME: {timeStr}</p>
                      <p className="font-mono text-[11px] text-gray-400 mt-1">
                        REF: RK-MAN-{Date.now().toString(36).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5 text-center text-xs">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Total Shipments</span>
                      <span className="font-outfit font-black text-base text-gray-900">
                        {filteredList.length} Pkgs
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Prepaid Orders</span>
                      <span className="font-outfit font-bold text-base text-emerald-700">
                        {prepaidCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">COD Shipments</span>
                      <span className="font-outfit font-bold text-base text-amber-700">
                        {codCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Total COD to Collect</span>
                      <span className="font-outfit font-black text-base text-gray-900">
                        ₹{totalCodAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Shipments Table */}
                  <table className="w-full text-left border-collapse text-xs border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold">
                        <th className="p-2 border-r border-gray-300 w-10 text-center">#</th>
                        <th className="p-2 border-r border-gray-300">Order ID</th>
                        <th className="p-2 border-r border-gray-300">Recipient Details</th>
                        <th className="p-2 border-r border-gray-300">Destination</th>
                        <th className="p-2 border-r border-gray-300">Courier / AWB</th>
                        <th className="p-2 border-r border-gray-300 text-center">Payment</th>
                        <th className="p-2 text-right">Collect (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredList.map((order, idx) => {
                        const isCod = order.paymentMethod === "COD";
                        return (
                          <tr key={order._id} className="hover:bg-gray-50/50">
                            <td className="p-2 border-r border-gray-200 text-center font-mono text-[11px] text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="p-2 border-r border-gray-200 font-mono font-bold text-gray-900 text-[11px]">
                              {order.orderNumber || `#${order._id.slice(-8).toUpperCase()}`}
                            </td>
                            <td className="p-2 border-r border-gray-200">
                              <p className="font-bold text-gray-900">{order.shippingAddress?.fullName || order.user?.name || "Customer"}</p>
                              <p className="text-[11px] text-gray-500 font-mono">
                                📞 {order.shippingAddress?.phone || order.user?.phone || "—"}
                              </p>
                            </td>
                            <td className="p-2 border-r border-gray-200">
                              <p className="text-gray-900 font-medium">
                                {order.shippingAddress?.city || "—"}, {order.shippingAddress?.state || "—"}
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono">
                                PIN: {order.shippingAddress?.postalCode || "—"}
                              </p>
                            </td>
                            <td className="p-2 border-r border-gray-200">
                              <p className="font-semibold text-gray-800">{order.courierName || "Standard"}</p>
                              <p className="font-mono text-[11px] text-gray-600">
                                {order.trackingNumber || "AWB Pending"}
                              </p>
                            </td>
                            <td className="p-2 border-r border-gray-200 text-center">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  isCod ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                                }`}
                              >
                                {isCod ? "COD" : "PREPAID"}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-gray-900">
                              {isCod ? `₹${(order.totalPrice || 0).toLocaleString("en-IN")}` : "₹0 (Paid)"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Sign-off Handover Box */}
                  <div className="mt-8 pt-4 border-t-2 border-gray-400 grid grid-cols-2 gap-8 text-xs">
                    <div className="border border-gray-300 rounded-xl p-4">
                      <p className="font-bold text-gray-900 uppercase tracking-wider mb-8">
                        1. Handed Over By (RK Saree Center Staff)
                      </p>
                      <div className="space-y-1 text-gray-600 text-[11px]">
                        <p>Staff Name: ____________________________________</p>
                        <p>Date &amp; Time: ____________________________________</p>
                        <p className="pt-2">Signature: ____________________________________</p>
                      </div>
                    </div>
                    <div className="border border-gray-300 rounded-xl p-4">
                      <p className="font-bold text-gray-900 uppercase tracking-wider mb-8">
                        2. Received By (Courier Pickup Rider)
                      </p>
                      <div className="space-y-1 text-gray-600 text-[11px]">
                        <p>Courier Partner / Hub: ___________________________</p>
                        <p>Rider Name &amp; Phone: ___________________________</p>
                        <p className="pt-2">Rider Signature: _________________________________</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-gray-400 mt-4">
                    Generated via RK Saree Center Merchant Portal • This document serves as legal handover proof of outbound commercial shipments.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
