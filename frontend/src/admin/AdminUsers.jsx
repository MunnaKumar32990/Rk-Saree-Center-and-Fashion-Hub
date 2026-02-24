import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import toast from "react-hot-toast";
import {
  FiSearch, FiFilter, FiDownload, FiTrash2, FiUser, FiMail,
  FiPhone, FiMapPin, FiCalendar, FiShoppingBag, FiDollarSign,
  FiShield, FiClock, FiAlertTriangle, FiCheckCircle, FiXCircle,
  FiMoreVertical, FiRefreshCw, FiLogOut, FiKey, FiEdit2,
  FiChevronLeft, FiChevronRight, FiX, FiEye
} from "react-icons/fi";
import { MdBlock, MdVerified } from "react-icons/md";

const STATUS_CONFIG = {
  Active: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  Suspended: { color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  Banned: { color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
};

// ── User Status Badge ────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status || "Active"}
    </span>
  );
};

// ── User Detail Modal ────────────────────────────────────────────────────────
const UserDetailModal = ({ userId, onClose, onRefresh }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [resetPwModal, setResetPwModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: res } = await api.get(`/users/${userId}`);
        setData(res);
      } catch {
        toast.error("Failed to load user details");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handleStatus = async (status) => {
    setActionLoading("status");
    try {
      await api.put(`/users/${userId}/status`, { status });
      toast.success(`User ${status}`);
      setData(prev => ({ ...prev, user: { ...prev.user, status } }));
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleForceLogout = async () => {
    setActionLoading("logout");
    try {
      await api.post(`/users/${userId}/force-logout`);
      toast.success("User force logged out");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setActionLoading("reset");
    try {
      await api.put(`/users/${userId}/reset-password`, { newPassword });
      toast.success("Password reset successfully");
      setResetPwModal(false);
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleRoleToggle = async () => {
    if (!data?.user) return;
    setActionLoading("role");
    try {
      await api.put(`/users/${userId}/role`, { isAdmin: !data.user.isAdmin });
      toast.success("Role updated");
      setData(prev => ({ ...prev, user: { ...prev.user, isAdmin: !prev.user.isAdmin } }));
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading("");
    }
  };

  const user = data?.user;
  const stats = data?.stats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              {user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="font-bold text-lg leading-none">{loading ? "Loading..." : user?.name}</h2>
              <p className="text-white/70 text-xs mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {["overview", "security", "orders"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors capitalize ${activeTab === tab
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Total Orders", value: stats?.totalOrders || 0, icon: FiShoppingBag, color: "text-blue-600 bg-blue-50" },
                      { label: "Total Spent", value: `₹${(stats?.totalSpent || 0).toLocaleString("en-IN")}`, icon: FiDollarSign, color: "text-green-600 bg-green-50" },
                      { label: "Wishlist Items", value: user?.wishlist?.length || 0, icon: FiUser, color: "text-purple-600 bg-purple-50" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mx-auto mb-2`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-xl font-bold text-gray-900">{value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* User Info */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: FiMail, label: "Email", value: user?.email },
                      { icon: FiPhone, label: "Phone", value: user?.phone || "Not provided" },
                      { icon: FiCalendar, label: "Registered", value: new Date(user?.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
                      { icon: FiClock, label: "Last Login", value: user?.lastLogin ? new Date(user.lastLogin).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                          <Icon className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-medium">{label}</p>
                          <p className="text-sm font-semibold text-gray-800 break-all">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Address */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <FiMapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">Address</span>
                    </div>
                    {user?.address?.city ? (
                      <p className="text-sm text-gray-600">
                        {[user.address.street, user.address.city, user.address.state, user.address.postalCode, user.address.country].filter(Boolean).join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No address saved</p>
                    )}
                  </div>

                  {/* Status & Role */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={user?.status} />
                    {user?.isAdmin && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                        <FiShield className="w-3 h-3" /> Admin
                      </span>
                    )}
                    {user?.isEmailVerified && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                        <MdVerified className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <FiAlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-700">Failed Logins</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{user?.failedLoginAttempts || 0}</p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <FiClock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-blue-700">Last Login</span>
                      </div>
                      <p className="text-sm font-semibold text-blue-600">
                        {user?.lastLogin ? new Date(user.lastLogin).toLocaleString("en-IN") : "Never"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <FiClock className="w-4 h-4" /> Login History (last 10)
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(user?.loginHistory || []).slice(0, 10).length > 0 ? (
                        user.loginHistory.slice(0, 10).map((log, i) => (
                          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl text-xs border ${log.status === "success" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                            {log.status === "success"
                              ? <FiCheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              : <FiXCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-700 truncate">{log.ip || "Unknown IP"}</p>
                              <p className="text-gray-400 truncate">{log.userAgent?.substring(0, 50) || "Unknown"}</p>
                            </div>
                            <span className="text-gray-400 flex-shrink-0">{new Date(log.timestamp).toLocaleDateString("en-IN")}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 italic text-center py-6">No login history available</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "orders" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                      <FiShoppingBag className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-700">{stats?.totalOrders || 0}</p>
                      <p className="text-xs text-blue-500 font-medium">Total Orders</p>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                      <FiDollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-700">₹{(stats?.totalSpent || 0).toLocaleString("en-IN")}</p>
                      <p className="text-xs text-green-500 font-medium">Total Spent</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 italic text-center py-4">Order history visible in Orders section filtered by user</p>
                </div>
              )}
            </div>

            {/* Action Footer */}
            {!user?.isAdmin && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex flex-wrap gap-2 justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleStatus("Active")} disabled={user?.status === "Active" || actionLoading === "status"}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                      <FiCheckCircle className="w-3.5 h-3.5" /> Activate
                    </button>
                    <button onClick={() => handleStatus("Suspended")} disabled={user?.status === "Suspended" || actionLoading === "status"}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                      <FiAlertTriangle className="w-3.5 h-3.5" /> Suspend
                    </button>
                    <button onClick={() => handleStatus("Banned")} disabled={user?.status === "Banned" || actionLoading === "status"}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                      <MdBlock className="w-3.5 h-3.5" /> Ban
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleForceLogout} disabled={actionLoading === "logout"}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                      <FiLogOut className="w-3.5 h-3.5" /> Force Logout
                    </button>
                    <button onClick={() => setResetPwModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors">
                      <FiKey className="w-3.5 h-3.5" /> Reset Password
                    </button>
                    <button onClick={handleRoleToggle} disabled={actionLoading === "role"}
                      className="flex items-center gap-1.5 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                      <FiShield className="w-3.5 h-3.5" /> {user?.isAdmin ? "Remove Admin" : "Make Admin"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reset Password Sub-modal */}
      {resetPwModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70" onClick={() => setResetPwModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reset Password</h3>
            <input type="password" placeholder="New password (min 6 chars)"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <div className="flex gap-3">
              <button onClick={handleResetPassword} disabled={actionLoading === "reset"}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                {actionLoading === "reset" ? "Resetting..." : "Reset"}
              </button>
              <button onClick={() => setResetPwModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main AdminUsers Component ────────────────────────────────────────────────
const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: 10, sortBy, sortOrder,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
      });
      const { data } = await api.get(`/users?${params}`);
      setUsers(data.users || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} user(s)? This cannot be undone.`)) return;
    try {
      await api.delete("/users/bulk", { data: { ids: selectedIds } });
      toast.success(`${selectedIds.length} user(s) deleted`);
      setSelectedIds([]);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const handleDeleteOne = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Role", "Status", "Registered"];
    const rows = users.map(u => [
      u.name, u.email, u.phone || "", u.isAdmin ? "Admin" : "Customer",
      u.status || "Active", new Date(u.createdAt).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) setSelectedIds([]);
    else setSelectedIds(users.map(u => u._id));
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("asc"); }
    setPage(1);
  };

  const sortIcon = (field) => sortBy === field ? (sortOrder === "asc" ? " ↑" : " ↓") : "";

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total.toLocaleString()} total users</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors">
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors">
              <FiDownload className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
                Search
              </button>
            </form>
            <div className="flex gap-2">
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="customer">Customer</option>
              </select>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Banned">Banned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-violet-700">{selectedIds.length} user(s) selected</span>
            <div className="flex gap-2">
              <button onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors">
                <FiTrash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
              <button onClick={() => setSelectedIds([])}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 w-10">
                    <input type="checkbox" checked={selectedIds.length === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-violet-600 rounded cursor-pointer" />
                  </th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort("name")}>
                    User{sortIcon("name")}
                  </th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort("createdAt")}>
                    Registered{sortIcon("createdAt")}
                  </th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort("lastLogin")}>
                    Last Login{sortIcon("lastLogin")}
                  </th>
                  <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td colSpan="8" className="p-4">
                        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-12 text-center">
                      <FiUser className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No users found</p>
                      <p className="text-gray-300 text-sm mt-1">Try a different search or filter</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4">
                        <input type="checkbox" checked={selectedIds.includes(user._id)}
                          onChange={() => toggleSelect(user._id)}
                          className="w-4 h-4 accent-violet-600 rounded cursor-pointer" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {user.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                            <p className="text-gray-400 text-xs truncate max-w-[180px]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{user.phone || <span className="text-gray-300">–</span>}</td>
                      <td className="p-4 text-center">
                        {user.isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                            <FiShield className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Customer
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={user.status || "Active"} />
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : <span className="text-gray-300">Never</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setSelectedUser(user._id)} title="View Details"
                            className="w-8 h-8 flex items-center justify-center text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                            <FiEye className="w-4 h-4" />
                          </button>
                          {!user.isAdmin && (
                            <button onClick={() => handleDeleteOne(user._id)} title="Delete"
                              className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {total} users
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${page === pageNum ? "bg-violet-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-white"}`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          userId={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefresh={fetchUsers}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUsers;