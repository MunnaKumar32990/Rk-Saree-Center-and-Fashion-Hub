import { useEffect, useState } from "react";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch General Stats
        const { data: statsData } = await api.get("/orders/stats", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setStats(statsData);

        // Fetch Monthly Revenue Data
        const { data: chartData } = await api.get("/orders/monthly-stats", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setMonthlyData(chartData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userInfo?.token) {
      fetchDashboardData();
    }
  }, [userInfo?.token]);

  if (loading || !stats) return <AdminLayout><div className="p-8">Loading Dashboard...</div></AdminLayout>;

  const orderChartData = [
    { name: "Total Orders", value: stats.totalOrders },
    { name: "Delivered", value: stats.deliveredOrders },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
          <p className="text-gray-500 font-medium">Total Orders</p>
          <h2 className="text-3xl font-bold text-gray-800">{stats.totalOrders}</h2>
        </div>

        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
          <p className="text-gray-500 font-medium">Delivered Orders</p>
          <h2 className="text-3xl font-bold text-gray-800">{stats.deliveredOrders}</h2>
        </div>

        <div className="bg-white p-6 rounded shadow border-l-4 border-purple-500">
          <p className="text-gray-500 font-medium">Revenue</p>
          <h2 className="text-3xl font-bold text-gray-800">₹{stats.totalRevenue?.toLocaleString()}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue Line Chart */}
        <div className="bg-white p-6 rounded shadow h-80">
          <h3 className="font-semibold mb-4 text-gray-700">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" stroke="#888888" fontSize={12} />
              <YAxis stroke="#888888" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#000" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Distribution Bar Chart */}
        <div className="bg-white p-6 rounded shadow h-80">
          <h3 className="font-semibold mb-4 text-gray-700">Order Delivery Status</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orderChartData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} />
              <YAxis stroke="#888888" fontSize={12} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;