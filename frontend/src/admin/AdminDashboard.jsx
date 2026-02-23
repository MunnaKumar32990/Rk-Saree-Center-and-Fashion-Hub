import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  FiShoppingBag, FiDollarSign, FiTruck, FiUsers,
  FiTrendingUp, FiPackage, FiXCircle, FiRotateCcw,
  FiAlertCircle, FiPercent
} from "react-icons/fi";

const StatCard = ({ icon: Icon, label, value, sub, gradient, iconBg }) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
        <p className="font-outfit font-black text-3xl">{value}</p>
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
  </div>
);

const MiniStatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="font-outfit font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-bold">
            {p.name === "revenue" ? `₹${p.value?.toLocaleString("en-IN")}` : p.value} {p.name}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, monthlyRes, ordersRes] = await Promise.all([
          api.get("/orders/stats"),
          api.get("/orders/monthly-stats"),
          api.get("/orders?limit=5"),
        ]);
        setStats(statsRes.data);
        setMonthlyData(monthlyRes.data || []);
        const ordersData = ordersRes.data;
        setRecentOrders(
          Array.isArray(ordersData) ? ordersData.slice(0, 5) : (ordersData.orders || []).slice(0, 5)
        );
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading || !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading Dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const orderStatusData = [
    { name: "Pending", value: stats.pendingOrders || 0 },
    { name: "Processing", value: stats.processingOrders || 0 },
    { name: "Delivered", value: stats.deliveredOrders || 0 },
    { name: "Returned", value: stats.returnedOrders || 0 },
    { name: "Cancelled", value: stats.cancelledOrders || 0 },
  ];

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-outfit text-2xl font-bold">Welcome back, Admin 👋</h1>
              <p className="text-primary-200 text-sm mt-1">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium">
              RK Saree Fashion Hub
            </div>
          </div>
        </div>

        {/* Primary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={FiShoppingBag} label="Total Orders" value={stats.totalOrders}
            sub="All time" gradient="bg-gradient-to-br from-blue-500 to-blue-700" iconBg="bg-white/20"
          />
          <StatCard
            icon={FiDollarSign} label="Total Revenue"
            value={`₹${(stats.totalRevenue || 0).toLocaleString("en-IN")}`}
            sub="Paid orders only" gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" iconBg="bg-white/20"
          />
          <StatCard
            icon={FiTruck} label="Delivered" value={stats.deliveredOrders}
            sub={`${stats.conversionRate}% success rate`}
            gradient="bg-gradient-to-br from-violet-500 to-violet-700" iconBg="bg-white/20"
          />
          <StatCard
            icon={FiUsers} label="Total Users" value={stats.totalUsers || "–"}
            sub="Registered accounts" gradient="bg-gradient-to-br from-rose-500 to-rose-700" iconBg="bg-white/20"
          />
        </div>

        {/* Today & Monthly Revenue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MiniStatCard icon={FiDollarSign} label="Today's Revenue"
            value={`₹${(stats.todayRevenue || 0).toLocaleString("en-IN")}`} color="bg-emerald-500" />
          <MiniStatCard icon={FiTrendingUp} label="This Month's Revenue"
            value={`₹${(stats.monthRevenue || 0).toLocaleString("en-IN")}`} color="bg-blue-500" />
          <MiniStatCard icon={FiAlertCircle} label="Pending Orders"
            value={stats.pendingOrders || 0} color="bg-orange-500" />
          <MiniStatCard icon={FiPackage} label="Today's Orders"
            value={stats.todayOrders || 0} color="bg-indigo-500" />
        </div>

        {/* Analytics Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversion Rate</p>
              <FiPercent className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="font-outfit font-black text-3xl text-emerald-600">{stats.conversionRate}%</p>
            <p className="text-xs text-gray-400 mt-1">Orders delivered / Total orders</p>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.conversionRate}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Refund Rate</p>
              <FiRotateCcw className="w-4 h-4 text-red-500" />
            </div>
            <p className="font-outfit font-black text-3xl text-red-500">{stats.refundRate}%</p>
            <p className="text-xs text-gray-400 mt-1">Refunded / Total orders</p>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-red-400 rounded-full transition-all" style={{ width: `${Math.min(stats.refundRate, 100)}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cancellation Rate</p>
              <FiXCircle className="w-4 h-4 text-orange-500" />
            </div>
            <p className="font-outfit font-black text-3xl text-orange-500">{stats.cancellationRate}%</p>
            <p className="text-xs text-gray-400 mt-1">Cancelled / Total orders</p>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-orange-400 rounded-full transition-all" style={{ width: `${Math.min(stats.cancellationRate, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly Revenue */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-outfit font-bold text-gray-900">Monthly Revenue</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 12 months</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full">
                <FiTrendingUp className="w-3.5 h-3.5" /> Revenue
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5}
                  fill="url(#colorRevenue)"
                  dot={{ r: 4, fill: "#4F46E5", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#4F46E5", strokeWidth: 3, stroke: "#EEF2FF" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
            <div className="mb-5">
              <h3 className="font-outfit font-bold text-gray-900">Order Status</h3>
              <p className="text-xs text-gray-400 mt-0.5">Current breakdown</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={orderStatusData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24} fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiPackage className="w-4 h-4 text-primary-600" />
              <h3 className="font-outfit font-bold text-gray-900">Recent Orders</h3>
            </div>
            <a href="/admin/orders" className="text-xs text-primary-600 font-semibold hover:underline">View all →</a>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No orders yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentOrders.map((order) => (
                <div key={order._id}
                  onClick={() => navigate(`/admin/orders/${order._id}`)}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                      {order.user?.name?.charAt(0)?.toUpperCase() || "G"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{order.user?.name || "Guest"}</p>
                      <p className="text-xs text-gray-400 font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-outfit font-bold text-sm text-gray-900">₹{order.totalPrice?.toLocaleString("en-IN")}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.status === "Delivered" ? "bg-green-100 text-green-700" :
                        order.status === "Cancelled" ? "bg-red-100 text-red-700" :
                          order.status === "Refunded" ? "bg-teal-100 text-teal-700" :
                            "bg-yellow-100 text-yellow-700"
                      }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Returned", value: stats.returnedOrders || 0, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Refunded", value: stats.refundedOrders || 0, color: "text-teal-600", bg: "bg-teal-50" },
            { label: "Cancelled", value: stats.cancelledOrders || 0, color: "text-red-600", bg: "bg-red-50" },
            { label: "Processing", value: stats.processingOrders || 0, color: "text-blue-600", bg: "bg-blue-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-2xl ${bg} border border-gray-100 p-4`}>
              <p className="text-xs font-medium text-gray-400">{label}</p>
              <p className={`font-outfit font-black text-2xl ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;