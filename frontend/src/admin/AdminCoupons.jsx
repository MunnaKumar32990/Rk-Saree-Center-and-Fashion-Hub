import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import toast from "react-hot-toast";
import {
    FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiTag,
    FiCalendar, FiPercent, FiDollarSign, FiCheck, FiToggleLeft, FiToggleRight
} from "react-icons/fi";

const CATEGORIES = ["Men", "Women", "Kids", "All"];

// ── Coupon Form Modal ─────────────────────────────────────────────────────────
const CouponFormModal = ({ coupon, onClose, onSaved }) => {
    const isEdit = !!coupon?._id;
    const [form, setForm] = useState({
        code: coupon?.code || "",
        description: coupon?.description || "",
        discountType: coupon?.discountType || "percentage",
        discountValue: coupon?.discountValue || "",
        minOrderAmount: coupon?.minOrderAmount || 0,
        maxDiscountAmount: coupon?.maxDiscountAmount || "",
        maxUses: coupon?.maxUses || "",
        startDate: coupon?.startDate ? coupon.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        expiresAt: coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : "",
        isActive: coupon?.isActive !== undefined ? coupon.isActive : true,
        applicableCategories: coupon?.applicableCategories || [],
    });
    const [saving, setSaving] = useState(false);

    const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const toggleCategory = (cat) => {
        setForm(prev => {
            const cats = prev.applicableCategories.includes(cat)
                ? prev.applicableCategories.filter(c => c !== cat)
                : [...prev.applicableCategories, cat];
            return { ...prev, applicableCategories: cats };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                discountValue: Number(form.discountValue),
                minOrderAmount: Number(form.minOrderAmount) || 0,
                maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
                maxUses: form.maxUses ? Number(form.maxUses) : null,
            };
            if (isEdit) {
                await api.put(`/coupons/${coupon._id}`, payload);
                toast.success("Coupon updated!");
            } else {
                await api.post("/coupons", payload);
                toast.success("Coupon created!");
            }
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save coupon");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Coupon" : "Create New Coupon"}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Code + Active Toggle */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Coupon Code *</label>
                            <input
                                className="w-full border border-gray-200 p-3 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                placeholder="e.g. SAVE20"
                                value={form.code}
                                onChange={e => setField("code", e.target.value.toUpperCase())}
                                required
                            />
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1">
                            <label className="text-sm font-semibold text-gray-700">Active</label>
                            <button type="button" onClick={() => setField("isActive", !form.isActive)}
                                className={`text-3xl transition-colors ${form.isActive ? "text-emerald-500" : "text-gray-300"}`}>
                                {form.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                            </button>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                        <input
                            className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder="e.g. Get 20% off on all orders"
                            value={form.description}
                            onChange={e => setField("description", e.target.value)}
                        />
                    </div>

                    {/* Discount Type + Value */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Type *</label>
                            <select value={form.discountType} onChange={e => setField("discountType", e.target.value)}
                                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (₹)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Discount Value * {form.discountType === "percentage" ? "(%)" : "(₹)"}
                            </label>
                            <input
                                type="number" min="0" max={form.discountType === "percentage" ? 100 : undefined}
                                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 100"}
                                value={form.discountValue}
                                onChange={e => setField("discountValue", e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Min Order + Max Discount Cap */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Min Order Amount (₹)</label>
                            <input type="number" min="0"
                                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                placeholder="0 = no minimum"
                                value={form.minOrderAmount}
                                onChange={e => setField("minOrderAmount", e.target.value)}
                            />
                        </div>
                        {form.discountType === "percentage" && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Max Discount Cap (₹)</label>
                                <input type="number" min="0"
                                    className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    placeholder="Leave blank for no cap"
                                    value={form.maxDiscountAmount}
                                    onChange={e => setField("maxDiscountAmount", e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Max Uses */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Max Uses</label>
                        <input type="number" min="0"
                            className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder="Leave blank for unlimited"
                            value={form.maxUses}
                            onChange={e => setField("maxUses", e.target.value)}
                        />
                    </div>

                    {/* Validity Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                            <input type="date"
                                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                value={form.startDate}
                                onChange={e => setField("startDate", e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date *</label>
                            <input type="date"
                                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                value={form.expiresAt}
                                onChange={e => setField("expiresAt", e.target.value)}
                                min={form.startDate}
                                required
                            />
                        </div>
                    </div>

                    {/* Applicable Categories */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Applicable Categories</label>
                        <p className="text-xs text-gray-400 mb-2">Leave all unselected for "all categories"</p>
                        <div className="flex flex-wrap gap-2">
                            {["Men", "Women", "Kids"].map(cat => (
                                <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${form.applicableCategories.includes(cat)
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "bg-white border-gray-200 text-gray-600 hover:border-emerald-400"}`}>
                                    {form.applicableCategories.includes(cat) && <FiCheck className="inline w-3 h-3 mr-1" />}
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    {form.code && form.discountValue && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-sm font-semibold text-emerald-700 mb-1">Preview</p>
                            <p className="text-emerald-600 text-sm">
                                Code: <span className="font-mono font-bold">{form.code}</span> →
                                {form.discountType === "percentage"
                                    ? ` ${form.discountValue}% off`
                                    : ` ₹${form.discountValue} off`}
                                {form.minOrderAmount > 0 && ` on orders above ₹${form.minOrderAmount}`}
                                {form.maxDiscountAmount && ` (max ₹${form.maxDiscountAmount})`}
                            </p>
                            {form.expiresAt && (
                                <p className="text-emerald-500 text-xs mt-1">
                                    Valid: {new Date(form.startDate).toLocaleDateString("en-IN")} → {new Date(form.expiresAt).toLocaleDateString("en-IN")}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
                            {saving ? "Saving..." : isEdit ? "Update Coupon" : "Create Coupon"}
                        </button>
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Status helpers ────────────────────────────────────────────────────────────
const getCouponStatus = (coupon) => {
    const now = new Date();
    if (!coupon.isActive) return { label: "Inactive", color: "bg-gray-100 text-gray-600" };
    if (now < new Date(coupon.startDate)) return { label: "Upcoming", color: "bg-blue-100 text-blue-700" };
    if (now > new Date(coupon.expiresAt)) return { label: "Expired", color: "bg-red-100 text-red-700" };
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { label: "Maxed Out", color: "bg-orange-100 text-orange-700" };
    return { label: "Active", color: "bg-emerald-100 text-emerald-700" };
};

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [editCoupon, setEditCoupon] = useState(null);

    const fetchCoupons = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10, ...(search && { search }) });
            const { data } = await api.get(`/coupons?${params}`);
            setCoupons(data.coupons || []);
            setTotalPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch {
            toast.error("Failed to load coupons");
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this coupon?")) return;
        try {
            await api.delete(`/coupons/${id}`);
            toast.success("Coupon deleted");
            fetchCoupons();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed");
        }
    };

    const handleEdit = (coupon) => {
        setEditCoupon(coupon);
        setShowForm(true);
    };

    return (
        <AdminLayout>
            <div className="animate-fade-in space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-outfit font-bold text-gray-900">Coupon Management</h1>
                        <p className="text-gray-500 text-sm mt-0.5">{total} total coupons</p>
                    </div>
                    <button onClick={() => { setEditCoupon(null); setShowForm(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors">
                        <FiPlus className="w-4 h-4" /> Create Coupon
                    </button>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-2">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Search by code or description..."
                                value={searchInput} onChange={e => setSearchInput(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                        <button type="submit" className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors">Search</button>
                    </form>
                </div>

                {/* Coupon Cards */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array(6).fill(0).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-44 animate-pulse" />
                        ))}
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                        <FiTag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">No coupons found</p>
                        <p className="text-gray-300 text-sm mt-1">Create your first coupon to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {coupons.map(coupon => {
                            const status = getCouponStatus(coupon);
                            const isPercent = coupon.discountType === "percentage";
                            return (
                                <div key={coupon._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow group">
                                    {/* Top Row */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono font-bold text-lg text-gray-900 tracking-widest">{coupon.code}</span>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                                            </div>
                                            {coupon.description && <p className="text-xs text-gray-400">{coupon.description}</p>}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(coupon)}
                                                className="w-7 h-7 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <FiEdit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(coupon._id)}
                                                className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <FiTrash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Discount Value */}
                                    <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2 mb-3">
                                        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                                            {isPercent ? <FiPercent className="w-4 h-4 text-emerald-600" /> : <FiDollarSign className="w-4 h-4 text-emerald-600" />}
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-emerald-700">
                                                {isPercent ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                                            </p>
                                            {coupon.minOrderAmount > 0 && (
                                                <p className="text-xs text-emerald-500">Min. order ₹{coupon.minOrderAmount}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-1.5 text-xs text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                                            {new Date(coupon.startDate).toLocaleDateString("en-IN")} → {new Date(coupon.expiresAt).toLocaleDateString("en-IN")}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">Used: <span className="font-semibold text-gray-600">{coupon.usedCount}</span>{coupon.maxUses ? `/${coupon.maxUses}` : ""}</span>
                                            {coupon.applicableCategories?.length > 0 && (
                                                <span className="text-gray-400">{coupon.applicableCategories.join(", ")}</span>
                                            )}
                                        </div>
                                        {coupon.maxDiscountAmount && (
                                            <p className="text-gray-400">Max discount: ₹{coupon.maxDiscountAmount}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            Previous
                        </button>
                        <span className="text-sm text-gray-500 px-4">Page {page} of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Coupon Form Modal */}
            {showForm && (
                <CouponFormModal
                    coupon={editCoupon}
                    onClose={() => { setShowForm(false); setEditCoupon(null); }}
                    onSaved={fetchCoupons}
                />
            )}
        </AdminLayout>
    );
};

export default AdminCoupons;
