import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiShield } from "react-icons/fi";

const Profile = () => {
  const { userInfo, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: userInfo?.name || "",
    email: userInfo?.email || "",
    phone: userInfo?.phone || "",
    address: {
      street: userInfo?.address?.street || "",
      city: userInfo?.address?.city || "",
      state: userInfo?.address?.state || "",
      pinCode: userInfo?.address?.postalCode || userInfo?.address?.pinCode || "",
    },
    password: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("profile");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(userInfo?.twoFactorEnabled || false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword && form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        address: form.address,
      };
      if (form.newPassword) {
        payload.password = form.newPassword;
      }
      const { data } = await api.put("/users/profile", payload);
      updateUser(data);
      toast.success("Profile updated successfully! ✅");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="bg-gradient-to-r from-brand-dark to-primary-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-outfit font-black">
              {userInfo?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-outfit text-2xl font-bold text-white">{userInfo?.name}</h1>
              <p className="text-gray-300 text-sm">{userInfo?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
          {["profile", "address", "password", "security"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-card p-8">
          {tab === "profile" && (
            <div className="space-y-5">
              <h2 className="font-outfit font-bold text-gray-900 text-lg mb-6">Personal Information</h2>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Full Name</label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Email (read-only)</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Phone Number</label>
                <div className="relative">
                  <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "address" && (
            <div className="space-y-5">
              <h2 className="font-outfit font-bold text-gray-900 text-lg mb-6">Delivery Address</h2>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Street Address</label>
                <div className="relative">
                  <FiMapPin className="absolute left-4 top-4 text-gray-400 w-4 h-4" />
                  <textarea
                    rows={3}
                    placeholder="House no, Street, Area"
                    value={form.address.street}
                    onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">City</label>
                  <input
                    type="text"
                    placeholder="City"
                    value={form.address.city}
                    onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">State</label>
                  <input
                    type="text"
                    placeholder="State"
                    value={form.address.state}
                    onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">PIN Code</label>
                  <input
                    type="text"
                    placeholder="PIN Code"
                    value={form.address.pinCode}
                    onChange={(e) => setForm({ ...form, address: { ...form.address, pinCode: e.target.value } })}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "password" && (
            <div className="space-y-5">
              <h2 className="font-outfit font-bold text-gray-900 text-lg mb-6">Change Password</h2>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">New Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <p className="text-sm text-gray-500">Leave blank to keep your current password.</p>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-5">
              <h2 className="font-outfit font-bold text-gray-900 text-lg mb-6">Security Settings</h2>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FiShield className="text-purple-600 w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600 mb-4">Add an extra layer of security to your account by requiring a code sent to your email.</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (twoFactorEnabled) {
                            await api.post("/users/2fa/disable");
                            setTwoFactorEnabled(false);
                            toast.success("2FA disabled");
                          } else {
                            await api.post("/users/2fa/enable");
                            setTwoFactorEnabled(true);
                            toast.success("2FA enabled");
                          }
                        } catch (error) {
                          toast.error("Failed to update 2FA settings");
                        }
                      }}
                      className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                        twoFactorEnabled
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                      {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold px-8 py-3.5 rounded-xl hover:shadow-brand-lg transition-all active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiSave className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
