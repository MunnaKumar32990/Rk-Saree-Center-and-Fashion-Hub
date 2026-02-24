import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import toast from "react-hot-toast";
import {
    FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiBell,
    FiCalendar, FiToggleLeft, FiToggleRight, FiRadio
} from "react-icons/fi";

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_OPTIONS = [
    { value: "offer", label: "🎁 Offer", preview: "bg-gradient-to-r from-rose-600 to-pink-500 text-white" },
    { value: "success", label: "✅ Success", preview: "bg-gradient-to-r from-emerald-600 to-teal-500 text-white" },
    { value: "warning", label: "⚠️ Warning", preview: "bg-gradient-to-r from-amber-500 to-orange-400 text-white" },
    { value: "info", label: "ℹ️ Info", preview: "bg-gradient-to-r from-blue-600 to-indigo-500 text-white" },
];

const getTypeStyle = (type) => TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[3];

const getStatus = (ann) => {
    const now = new Date();
    if (!ann.isActive) return { label: "Inactive", color: "bg-gray-100 text-gray-600" };
    if (now < new Date(ann.startDate)) return { label: "Scheduled", color: "bg-blue-100 text-blue-700" };
    if (now > new Date(ann.endDate)) return { label: "Expired", color: "bg-red-100 text-red-700" };
    return { label: "Live", color: "bg-emerald-100 text-emerald-700" };
};

// ── Default form values ───────────────────────────────────────────────────────
const defaultForm = () => ({
    message: "",
    type: "offer",
    bgColor: "",
    isActive: true,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
});

// ── Modal ─────────────────────────────────────────────────────────────────────
const AnnouncementModal = ({ announcement, onClose, onSaved }) => {
    const isEdit = !!announcement?._id;
    const [form, setForm] = useState(
        announcement
            ? {
                message: announcement.message || "",
                type: announcement.type || "offer",
                bgColor: announcement.bgColor || "",
                isActive: announcement.isActive !== undefined ? announcement.isActive : true,
                startDate: announcement.startDate ? announcement.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
                endDate: announcement.endDate ? announcement.endDate.slice(0, 10) : "",
            }
            : defaultForm()
    );
    const [saving, setSaving] = useState(false);

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.message.trim()) { toast.error("Message is required"); return; }
        if (!form.endDate) { toast.error("End date is required"); return; }

        setSaving(true);
        try {
            const payload = {
                ...form,
                bgColor: form.bgColor || "",
            };
            if (isEdit) {
                await api.put(`/announcements/${announcement._id}`, payload);
                toast.success("Announcement updated!");
            } else {
                await api.post("/announcements", payload);
                toast.success("Announcement created!");
            }
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    // Live preview
    const previewStyle = form.bgColor ? { background: form.bgColor } : undefined;
    const previewClass = form.bgColor ? "text-white" : getTypeStyle(form.type).preview;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FiBell className="w-5 h-5 text-primary-600" />
                        {isEdit ? "Edit Announcement" : "Create Announcement"}
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Live Preview */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Live Preview</p>
                        <div
                            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold min-h-[44px] transition-all ${form.bgColor ? "" : previewClass}`}
                            style={previewStyle}
                        >
                            <FiRadio className="w-4 h-4 opacity-80 flex-shrink-0" />
                            <span>{form.message || "Your announcement will appear here…"}</span>
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={2}
                            className="w-full border border-gray-200 p-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. 🎉 Holi Sale! Flat 20% OFF on all sarees — Use code HOLI20"
                            value={form.message}
                            onChange={e => set("message", e.target.value)}
                            required
                        />
                        <p className="text-xs text-gray-400 mt-1">{form.message.length}/200 characters</p>
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Banner Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TYPE_OPTIONS.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => set("type", t.value)}
                                    className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${form.type === t.value
                                        ? "border-primary-500 bg-primary-50 text-primary-700"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom BG Color */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Custom Background Color <span className="text-gray-400 font-normal">(optional — overrides type colour)</span>
                        </label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="color"
                                value={form.bgColor || "#e11d48"}
                                onChange={e => set("bgColor", e.target.value)}
                                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                            />
                            <input
                                type="text"
                                className="flex-1 border border-gray-200 p-3 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Leave blank to use type colour"
                                value={form.bgColor}
                                onChange={e => set("bgColor", e.target.value)}
                            />
                            {form.bgColor && (
                                <button type="button" onClick={() => set("bgColor", "")}
                                    className="text-xs text-gray-400 hover:text-red-500 px-2">Clear</button>
                            )}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                            <input
                                type="date"
                                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={form.startDate}
                                onChange={e => set("startDate", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                End Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={form.endDate}
                                min={form.startDate}
                                onChange={e => set("endDate", e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Active */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="text-sm font-semibold text-gray-700">Active</p>
                            <p className="text-xs text-gray-400">Toggle to show/hide on the storefront</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => set("isActive", !form.isActive)}
                            className={`text-3xl transition-colors ${form.isActive ? "text-emerald-500" : "text-gray-300"}`}
                        >
                            {form.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                        </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                        >
                            {saving ? "Saving…" : isEdit ? "Update Announcement" : "Create Announcement"}
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

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/announcements?limit=50");
            setAnnouncements(data.announcements || []);
        } catch {
            toast.error("Failed to load announcements");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this announcement?")) return;
        try {
            await api.delete(`/announcements/${id}`);
            toast.success("Announcement deleted");
            fetchAnnouncements();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed");
        }
    };

    const handleToggleActive = async (ann) => {
        try {
            await api.put(`/announcements/${ann._id}`, { isActive: !ann.isActive });
            toast.success(ann.isActive ? "Announcement hidden" : "Announcement activated");
            fetchAnnouncements();
        } catch {
            toast.error("Failed to update");
        }
    };

    const filtered = announcements.filter(a =>
        a.message.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="animate-fade-in space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-outfit font-bold text-gray-900 flex items-center gap-2">
                            <FiBell className="w-6 h-6 text-primary-600" />
                            Announcements
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            {announcements.filter(a => a.isLive).length} live · {announcements.length} total
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditItem(null); setShowForm(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
                    >
                        <FiPlus className="w-4 h-4" /> New Announcement
                    </button>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search announcements..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                </div>

                {/* Cards */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-36 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                        <FiBell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">No announcements yet</p>
                        <p className="text-gray-300 text-sm mt-1">Create one to show a banner on the storefront</p>
                        <button
                            onClick={() => { setEditItem(null); setShowForm(true); }}
                            className="mt-4 px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors"
                        >
                            + Create Announcement
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map(ann => {
                            const status = getStatus(ann);
                            const typeStyle = getTypeStyle(ann.type);
                            const previewStyle = ann.bgColor ? { background: ann.bgColor } : undefined;
                            const previewClass = ann.bgColor ? "text-white" : typeStyle.preview;

                            return (
                                <div key={ann._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                                    {/* Banner Preview strip */}
                                    <div
                                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold ${ann.bgColor ? "" : previewClass}`}
                                        style={previewStyle}
                                    >
                                        <FiRadio className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                                        <span className="truncate">{ann.message}</span>
                                    </div>

                                    {/* Card body */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                                    {typeStyle.label}
                                                </span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleToggleActive(ann)}
                                                    className={`text-xl transition-colors ${ann.isActive ? "text-emerald-500" : "text-gray-300 hover:text-emerald-400"}`}
                                                    title={ann.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {ann.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                                                </button>
                                                <button
                                                    onClick={() => { setEditItem(ann); setShowForm(true); }}
                                                    className="w-7 h-7 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                                >
                                                    <FiEdit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ann._id)}
                                                    className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <FiTrash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                            <FiCalendar className="w-3.5 h-3.5" />
                                            <span>
                                                {new Date(ann.startDate).toLocaleDateString("en-IN")}
                                                {" → "}
                                                {new Date(ann.endDate).toLocaleDateString("en-IN")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showForm && (
                <AnnouncementModal
                    announcement={editItem}
                    onClose={() => { setShowForm(false); setEditItem(null); }}
                    onSaved={fetchAnnouncements}
                />
            )}
        </AdminLayout>
    );
};

export default AdminAnnouncements;
