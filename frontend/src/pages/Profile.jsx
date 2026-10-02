import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiSave,
  FiShield,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiHome,
  FiBriefcase,
  FiX,
  FiLoader,
  FiMonitor,
  FiSmartphone,
  FiAlertTriangle,
  FiLogOut,
} from "react-icons/fi";

const Profile = () => {
  const { userInfo, updateUser, logout } = useAuth();
  const [form, setForm] = useState({
    name: userInfo?.name || "",
    email: userInfo?.email || "",
    phone: userInfo?.phone || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("profile");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(userInfo?.twoFactorEnabled || false);

  // Address book states
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    fullName: userInfo?.name || "",
    phone: userInfo?.phone || "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    postalCode: "",
    isDefault: false,
  });
  const [pinLoading, setPinLoading] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);

  useEffect(() => {
    if (tab === "security") {
      setLoginHistoryLoading(true);
      api.get("/users/login-history")
        .then((res) => {
          setLoginHistory(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {})
        .finally(() => setLoginHistoryLoading(false));
    }
  }, [tab]);

  const parseDevice = (ua = "") => {
    let os = "Device";
    let browser = "Browser";
    if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Windows/i.test(ua)) os = "Windows PC";
    else if (/Macintosh|Mac OS/i.test(ua)) os = "Mac";
    else if (/Linux/i.test(ua)) os = "Linux";

    if (/Edg/i.test(ua)) browser = "Edge";
    else if (/Chrome|CriOS/i.test(ua)) browser = "Chrome";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Safari/i.test(ua)) browser = "Safari";

    return { os, browser, isMobile: /Android|iPhone|iPad|iPod/i.test(ua) };
  };

  const handleRevokeSessions = async () => {
    if (!window.confirm("This will log you out from all other active sessions and devices. Proceed?")) return;
    try {
      await api.post("/users/revoke-sessions");
      toast.success("All other sessions revoked. Please log in again to refresh your security key.");
      logout();
    } catch {
      toast.error("Failed to revoke sessions");
    }
  };

  const addresses = userInfo?.addresses && userInfo.addresses.length > 0
    ? userInfo.addresses
    : userInfo?.address?.street
      ? [{
          _id: "default-legacy",
          fullName: userInfo.address.fullName || userInfo.name || "",
          label: "Home",
          street: userInfo.address.street || "",
          landmark: userInfo.address.landmark || "",
          city: userInfo.address.city || "",
          state: userInfo.address.state || "",
          postalCode: userInfo.address.postalCode || userInfo.address.pinCode || "",
          phone: userInfo.address.phone || userInfo.phone || "",
          isDefault: true,
        }]
      : [];

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (tab === "password") {
      if (!form.currentPassword) {
        toast.error("Please enter your current password");
        return;
      }
      if (!form.newPassword) {
        toast.error("Please enter a new password");
        return;
      }
      if (form.newPassword.length < 8) {
        toast.error("New password must be at least 8 characters");
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
      };
      if (tab === "password" && form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.password = form.newPassword;
      }
      const { data } = await api.put("/users/profile", payload);
      updateUser(data);
      toast.success(tab === "password" ? "Password updated successfully! ✅" : "Profile updated successfully! ✅");
      if (tab === "password") {
        setForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLookup = async (pin) => {
    const clean = pin.replace(/\D/g, "").slice(0, 6);
    setAddressForm((f) => ({ ...f, postalCode: clean }));
    if (clean.length === 6) {
      setPinLoading(true);
      try {
        const { data } = await api.post("/contact/check-pincode", { pincode: clean });
        if (data?.city || data?.state) {
          setAddressForm((f) => ({
            ...f,
            city: data.city || data.district || f.city,
            state: data.state || f.state,
          }));
          toast.success(`Serviceable: ${data.city || data.district || ""}, ${data.state || ""}`);
        }
      } catch {
        // Soft fail
      } finally {
        setPinLoading(false);
      }
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.fullName.trim()) {
      toast.error("Please enter recipient name");
      return;
    }
    if (!addressForm.street.trim() || addressForm.street.trim().length < 6) {
      toast.error("Please enter full street address");
      return;
    }
    if (!addressForm.city.trim() || !addressForm.state.trim()) {
      toast.error("Please enter city and state");
      return;
    }
    if (!/^[1-9]\d{5}$/.test(addressForm.postalCode)) {
      toast.error("Please enter a valid 6-digit PIN code");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(addressForm.phone.replace(/\D/g, ""))) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      let updated = [...addresses];
      const newEntry = {
        label: addressForm.label || "Home",
        fullName: addressForm.fullName.trim(),
        phone: addressForm.phone.replace(/\D/g, ""),
        street: addressForm.street.trim(),
        landmark: addressForm.landmark.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postalCode: addressForm.postalCode.trim(),
        country: "India",
        isDefault: Boolean(addressForm.isDefault) || addresses.length === 0,
      };

      if (editingAddressId) {
        updated = updated.map((a) => (a._id === editingAddressId ? { ...newEntry, _id: a._id } : a));
      } else {
        updated.push(newEntry);
      }

      // If set as default, clear default from others
      if (newEntry.isDefault) {
        updated = updated.map((a, idx) => ({
          ...a,
          isDefault: editingAddressId ? a._id === editingAddressId : idx === updated.length - 1,
        }));
      }

      const defaultAddr = updated.find((a) => a.isDefault) || updated[0];
      const { data } = await api.put("/users/profile", {
        addresses: updated,
        address: defaultAddr
          ? {
              fullName: defaultAddr.fullName,
              street: defaultAddr.street,
              city: defaultAddr.city,
              state: defaultAddr.state,
              postalCode: defaultAddr.postalCode,
              landmark: defaultAddr.landmark,
              phone: defaultAddr.phone,
              country: "India",
            }
          : undefined,
      });

      updateUser(data);
      toast.success(editingAddressId ? "Address updated! ✅" : "New address added! ✅");
      setIsAddingAddress(false);
      setEditingAddressId(null);
      setAddressForm({
        label: "Home",
        fullName: userInfo?.name || "",
        phone: userInfo?.phone || "",
        street: "",
        landmark: "",
        city: "",
        state: "",
        postalCode: "",
        isDefault: false,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (addrId) => {
    setLoading(true);
    try {
      const updated = addresses.map((a) => ({
        ...a,
        isDefault: a._id === addrId,
      }));
      const defaultAddr = updated.find((a) => a.isDefault);
      const { data } = await api.put("/users/profile", {
        addresses: updated,
        address: defaultAddr
          ? {
              fullName: defaultAddr.fullName,
              street: defaultAddr.street,
              city: defaultAddr.city,
              state: defaultAddr.state,
              postalCode: defaultAddr.postalCode,
              landmark: defaultAddr.landmark,
              phone: defaultAddr.phone,
              country: "India",
            }
          : undefined,
      });
      updateUser(data);
      toast.success("Default delivery address set! ⭐");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update default address");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm("Are you sure you want to remove this address?")) return;
    setLoading(true);
    try {
      const remaining = addresses.filter((a) => a._id !== addrId);
      if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
        remaining[0].isDefault = true;
      }
      const defaultAddr = remaining.find((a) => a.isDefault) || remaining[0];
      const { data } = await api.put("/users/profile", {
        addresses: remaining,
        address: defaultAddr
          ? {
              fullName: defaultAddr.fullName,
              street: defaultAddr.street,
              city: defaultAddr.city,
              state: defaultAddr.state,
              postalCode: defaultAddr.postalCode,
              landmark: defaultAddr.landmark,
              phone: defaultAddr.phone,
              country: "India",
            }
          : {},
      });
      updateUser(data);
      toast.success("Address removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete address");
    } finally {
      setLoading(false);
    }
  };

  const startEditAddress = (addr) => {
    setAddressForm({
      label: addr.label || "Home",
      fullName: addr.fullName || userInfo?.name || "",
      phone: addr.phone || userInfo?.phone || "",
      street: addr.street || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      postalCode: addr.postalCode || "",
      isDefault: Boolean(addr.isDefault),
    });
    setEditingAddressId(addr._id);
    setIsAddingAddress(true);
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
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit overflow-x-auto max-w-full">
          {["profile", "address", "password", "security"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setIsAddingAddress(false);
                setEditingAddressId(null);
              }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize whitespace-nowrap transition-all ${
                tab === t ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "address" ? "Saved Addresses" : t}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-card p-8">
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
        )}

        {/* ── ADDRESS BOOK TAB ────────────────────────────────────────────── */}
        {tab === "address" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-outfit font-bold text-gray-900 text-lg">Delivery Addresses</h2>
                <p className="text-sm text-gray-500">Manage your saved addresses for fast 1-tap checkout</p>
              </div>
              {!isAddingAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddressId(null);
                    setAddressForm({
                      label: "Home",
                      fullName: userInfo?.name || "",
                      phone: userInfo?.phone || "",
                      street: "",
                      landmark: "",
                      city: "",
                      state: "",
                      postalCode: "",
                      isDefault: addresses.length === 0,
                    });
                    setIsAddingAddress(true);
                  }}
                  className="flex items-center gap-2 bg-primary-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-700 transition-all shadow-sm active:scale-95"
                >
                  <FiPlus className="w-4 h-4" /> Add New Address
                </button>
              )}
            </div>

            {/* Address Form (Add/Edit) */}
            {isAddingAddress ? (
              <form onSubmit={handleSaveAddress} className="border border-primary-200 bg-primary-50/20 rounded-2xl p-5 sm:p-6 mb-8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-primary-100">
                  <h3 className="font-outfit font-bold text-gray-900">
                    {editingAddressId ? "Edit Address" : "Add New Delivery Address"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAddress(false);
                      setEditingAddressId(null);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Label Choice */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">Address Label</label>
                  <div className="flex gap-2">
                    {["Home", "Office", "Other"].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setAddressForm((f) => ({ ...f, label: lbl }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          addressForm.label === lbl
                            ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {lbl === "Home" ? <FiHome className="w-3.5 h-3.5" /> : lbl === "Office" ? <FiBriefcase className="w-3.5 h-3.5" /> : <FiMapPin className="w-3.5 h-3.5" />}
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Munna Kumar"
                      value={addressForm.fullName}
                      onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">10-Digit Mobile *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Street Address, House No, Flat *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. House #14, Near Durga Mandir, Main Road"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      PIN Code * {pinLoading && <FiLoader className="inline w-3 h-3 animate-spin text-primary-600" />}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="6 digits"
                      value={addressForm.postalCode}
                      onChange={(e) => handlePinLookup(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">State *</label>
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Landmark (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Opposite Post Office"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isDefaultCheck"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <label htmlFor="isDefaultCheck" className="text-xs text-gray-700 font-medium">
                    Make this my default delivery address
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary-600 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-60"
                  >
                    {loading ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAddress(false);
                      setEditingAddressId(null);
                    }}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 px-4 py-2.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {/* Saved Addresses List */}
            {addresses.length === 0 && !isAddingAddress ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                <FiMapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-700 mb-1">No addresses saved yet</p>
                <p className="text-xs text-gray-500 mb-4">Add your home or office address for easy 1-tap checkout</p>
                <button
                  type="button"
                  onClick={() => setIsAddingAddress(true)}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-700 transition-all"
                >
                  <FiPlus className="w-4 h-4" /> Add Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr._id || `${addr.street}-${addr.postalCode}`}
                    className={`p-5 rounded-2xl border transition-all relative ${
                      addr.isDefault
                        ? "border-primary-500 bg-primary-50/20 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {addr.label === "Home" ? <FiHome className="w-3 h-3" /> : addr.label === "Office" ? <FiBriefcase className="w-3 h-3" /> : <FiMapPin className="w-3 h-3" />}
                          {addr.label || "Address"}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[11px] font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <FiCheck className="w-3 h-3" /> Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditAddress(addr)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50"
                          title="Edit"
                        >
                          <FiUser className="w-3.5 h-3.5" />
                        </button>
                        {addresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"
                            title="Delete"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-semibold text-gray-900 text-sm">{addr.fullName || userInfo?.name}</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {addr.street}
                      {addr.landmark && <span className="text-gray-500 block">Landmark: {addr.landmark}</span>}
                    </p>
                    <p className="text-xs font-medium text-gray-700 mt-1">
                      {addr.city}, {addr.state} - <span className="font-bold">{addr.postalCode}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                      <FiPhone className="w-3 h-3" /> {addr.phone || userInfo?.phone || "No phone"}
                    </p>

                    {!addr.isDefault && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleSetDefault(addr._id)}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
                        >
                          Set as Default Address
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PASSWORD TAB ────────────────────────────────────────────────── */}
        {tab === "password" && (
          <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-card p-8">
            <div className="space-y-5">
              <h2 className="font-outfit font-bold text-gray-900 text-lg mb-6">Change Password</h2>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter your current password"
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">New Password</label>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <p className="text-sm text-gray-500">You will need your current password to set a new one (min 8 characters).</p>
            </div>

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
                Update Password
              </button>
            </div>
          </form>
        )}

        {/* ── SECURITY TAB ────────────────────────────────────────────────── */}
        {tab === "security" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8">
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
                        } catch {
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

              {/* Login History & Devices */}
              <div className="pt-6 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-outfit font-bold text-gray-900 text-base">
                      Recent Devices &amp; Login Activity
                    </h3>
                    <p className="text-xs text-gray-500">
                      Review recent successful and blocked login sessions for your account
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRevokeSessions}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors w-fit"
                  >
                    <FiLogOut className="w-3.5 h-3.5" />
                    <span>Sign Out All Other Devices</span>
                  </button>
                </div>

                {loginHistoryLoading ? (
                  <div className="p-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Loading session security log...
                  </div>
                ) : loginHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                    No recent logins recorded.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {loginHistory.slice(0, 8).map((log, index) => {
                      const device = parseDevice(log.userAgent);
                      const isSuccess = log.status === "success";
                      const dateFormatted = log.timestamp
                        ? new Date(log.timestamp).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now";

                      return (
                        <div
                          key={log._id || index}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isSuccess
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {device.isMobile ? (
                                <FiSmartphone className="w-4 h-4" />
                              ) : (
                                <FiMonitor className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {device.browser} on {device.os}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                                <span>{dateFormatted}</span>
                                {log.ip && <span>• IP: {log.ip}</span>}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isSuccess
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {isSuccess ? "Active / Success" : "Failed / Blocked"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
