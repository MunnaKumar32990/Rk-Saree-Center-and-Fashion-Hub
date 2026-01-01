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

  if (loading || !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading Dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const orderChartData = [
    { name: "Total Orders", value: stats.totalOrders },
    { name: "Delivered", value: stats.deliveredOrders },
  ];

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Dashboard Overview</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-scale-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 font-medium text-sm uppercase tracking-wide mb-2">Total Orders</p>
                <h2 className="text-4xl font-bold text-gray-800">{stats.totalOrders}</h2>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 font-medium text-sm uppercase tracking-wide mb-2">Delivered Orders</p>
                <h2 className="text-4xl font-bold text-gray-800">{stats.deliveredOrders}</h2>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 font-medium text-sm uppercase tracking-wide mb-2">Total Revenue</p>
                <h2 className="text-4xl font-bold text-gray-800">₹{stats.totalRevenue?.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Revenue Line Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg h-80 animate-fade-in">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Monthly Revenue Trend</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#000" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#000' }} 
                  activeDot={{ r: 8, fill: '#000' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Orders Distribution Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg h-80 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h3 className="font-bold text-lg mb-4 text-gray-900">Order Delivery Status</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderChartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;