import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import {
    FiArrowLeft, FiPackage, FiUser, FiMapPin, FiCreditCard,
    FiTruck, FiClock, FiDownload, FiPrinter, FiEdit2, FiCheck,
    FiRotateCcw, FiAlertCircle
} from "react-icons/fi";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    "Pending Payment": { color: "bg-orange-100 text-orange-700", ring: "ring-orange-300", dot: "bg-orange-400", icon: "⏳" },
    Paid: { color: "bg-blue-100 text-blue-700", ring: "ring-blue-300", dot: "bg-blue-500", icon: "💳" },
    Confirmed: { color: "bg-indigo-100 text-indigo-700", ring: "ring-indigo-300", dot: "bg-indigo-500", icon: "✅" },
    Packed: { color: "bg-violet-100 text-violet-700", ring: "ring-violet-300", dot: "bg-violet-500", icon: "📦" },
    Shipped: { color: "bg-cyan-100 text-cyan-700", ring: "ring-cyan-300", dot: "bg-cyan-500", icon: "🚚" },
    "Out for Delivery": { color: "bg-purple-100 text-purple-700", ring: "ring-purple-300", dot: "bg-purple-500", icon: "🛵" },
    Delivered: { color: "bg-green-100 text-green-700", ring: "ring-green-300", dot: "bg-green-500", icon: "🎉" },
    Returned: { color: "bg-yellow-100 text-yellow-700", ring: "ring-yellow-300", dot: "bg-yellow-500", icon: "↩️" },
    Refunded: { color: "bg-teal-100 text-teal-700", ring: "ring-teal-300", dot: "bg-teal-500", icon: "💰" },
    Cancelled: { color: "bg-red-100 text-red-700", ring: "ring-red-300", dot: "bg-red-500", icon: "❌" },
};

const VALID_TRANSITIONS = {
    "Pending Payment": ["Paid", "Cancelled"],
    Paid: ["Confirmed", "Cancelled"],
    Confirmed: ["Packed", "Cancelled"],
    Packed: ["Shipped", "Cancelled"],
    Shipped: ["Out for Delivery"],
    "Out for Delivery": ["Delivered"],
    Delivered: ["Returned"],
    Returned: ["Refunded"],
    Refunded: [],
    Cancelled: [],
};

// ─── Section Card ─────────────────────────────────────────────────────────────
const Card = ({ title, icon: Icon, children, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary-600" />
            <h3 className="font-outfit font-bold text-gray-900 text-sm">{title}</h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, mono = false }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider sm:w-40 shrink-0">{label}</span>
        <span className={`text-sm text-gray-800 font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Pending Payment"];
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.color}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {status}
        </span>
    );
};

// ─── Timeline ────────────────────────────────────────────────────────────────
const StatusTimeline = ({ history }) => {
    if (!history?.length) return <p className="text-sm text-gray-400 italic">No history yet.</p>;
    return (
        <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-5">
                {[...history].reverse().map((item, i) => {
                    const cfg = STATUS_CONFIG[item.status] || {};
                    return (
                        <div key={i} className="flex gap-4 relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${cfg.color || "bg-gray-100 text-gray-600"}`}>
                                <span className="text-xs">{STATUS_CONFIG[item.status]?.icon || "•"}</span>
                            </div>
                            <div className="flex-1 pt-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-gray-900">{item.status}</span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(item.updatedAt).toLocaleString("en-IN", {
                                            day: "numeric", month: "short", year: "numeric",
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                                {item.note && <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>}
                                {item.changedByName && (
                                    <p className="text-xs text-gray-400 mt-0.5">by {item.changedByName}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminOrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [returnReq, setReturnReq] = useState(null);

    // Status change
    const [newStatus, setNewStatus] = useState("");
    const [statusNote, setStatusNote] = useState("");
    const [trackingNum, setTrackingNum] = useState("");
    const [courierName, setCourierName] = useState("");
    const [updating, setUpdating] = useState(false);

    // Return management
    const [returnAction, setReturnAction] = useState("");
    const [returnNote, setReturnNote] = useState("");
    const [refundAmt, setRefundAmt] = useState("");
    const [returnLoading, setReturnLoading] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchOrder = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/orders/${id}`);
            setOrder(data);
            setTrackingNum(data.trackingNumber || "");
            setCourierName(data.courierName || "");
            // Fetch return request
            const ret = await api.get(`/orders/${id}/return`).catch(() => ({ data: null }));
            setReturnReq(ret.data);
        } catch {
            toast.error("Failed to load order");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrder(); }, [id]);

    // ── Update Status ──────────────────────────────────────────────────────────
    const handleStatusUpdate = async () => {
        if (!newStatus) return toast.error("Select a new status");
        setUpdating(true);
        try {
            await api.put(`/orders/${id}/status`, {
                status: newStatus,
                note: statusNote,
                trackingNumber: trackingNum,
                courierName,
            });
            toast.success(`Status updated to ${newStatus}`);
            setNewStatus("");
            setStatusNote("");
            await fetchOrder();
        } catch (err) {
            toast.error(err.response?.data?.message || "Update failed");
        } finally {
            setUpdating(false);
        }
    };

    // ── Return Action ──────────────────────────────────────────────────────────
    const handleReturnAction = async () => {
        if (!returnAction) return;
        setReturnLoading(true);
        try {
            await api.put(`/orders/returns/${returnReq._id}`, {
                status: returnAction,
                adminNote: returnNote,
                refundAmount: Number(refundAmt) || order?.totalPrice,
            });
            toast.success(`Return ${returnAction.toLowerCase()}`);
            await fetchOrder();
        } catch (err) {
            toast.error(err.response?.data?.message || "Action failed");
        } finally {
            setReturnLoading(false);
        }
    };

    // ── Invoice PDF ────────────────────────────────────────────────────────────
    const downloadInvoice = () => {
        if (!order) return;
        const doc = new jsPDF();
        const col1 = 20, col2 = 120;

        // Header
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 210, 40, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("RK Saree & Fashion Hub", col1, 18);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("INVOICE", col2, 18);

        doc.setTextColor(0, 0, 0);
        let y = 55;

        // Order info
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Order ID: #${order._id.slice(-8).toUpperCase()}`, col1, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        y += 7;
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, col1, y);
        doc.text(`Status: ${order.status}`, col2, y);
        y += 5;
        doc.text(`Payment: ${order.isPaid ? "Paid" : "Unpaid"} (${order.paymentMethod})`, col1, y);

        y += 12;
        doc.line(col1, y, 190, y);
        y += 8;

        // Customer
        doc.setFont("helvetica", "bold");
        doc.text("Customer", col1, y);
        doc.setFont("helvetica", "normal");
        y += 6;
        doc.text(`Name: ${order.user?.name || "—"}`, col1, y);
        doc.text(`Email: ${order.user?.email || "—"}`, col2, y);
        y += 6;
        doc.text(`Phone: ${order.shippingAddress?.phone || "—"}`, col1, y);
        y += 6;
        doc.text(`Address: ${order.shippingAddress?.address}, ${order.shippingAddress?.city} - ${order.shippingAddress?.postalCode}`, col1, y);

        y += 12;
        doc.line(col1, y, 190, y);
        y += 8;

        // Items
        doc.setFont("helvetica", "bold");
        doc.text("Items", col1, y);
        doc.text("Qty", 130, y);
        doc.text("Price", 150, y);
        doc.text("Subtotal", 170, y);
        y += 6;
        doc.line(col1, y, 190, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);

        order.orderItems?.forEach((item) => {
            const name = item.name.length > 50 ? item.name.slice(0, 47) + "..." : item.name;
            doc.text(name, col1, y);
            doc.text(String(item.qty), 134, y);
            doc.text(`Rs.${item.price}`, 148, y);
            doc.text(`Rs.${(item.qty * item.price).toFixed(0)}`, 170, y);
            y += 7;
        });

        y += 3;
        doc.line(col1, y, 190, y);
        y += 8;

        // Pricing
        doc.setFontSize(9);
        const priceX = 150;
        const addRow = (label, value) => {
            doc.text(label, col1, y);
            doc.text(`Rs.${value}`, priceX, y);
            y += 6;
        };
        addRow("Subtotal:", order.itemsPrice?.toFixed(0) || 0);
        if (order.couponDiscount > 0) addRow(`Coupon (${order.couponCode}):`, `-${order.couponDiscount}`);
        if (order.discountPrice > 0) addRow("Discount:", `-${order.discountPrice}`);
        addRow("Shipping:", order.shippingPrice?.toFixed(0) || 0);
        addRow("Tax:", order.taxPrice?.toFixed(0) || 0);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Grand Total:", col1, y);
        doc.text(`Rs.${order.totalPrice?.toFixed(0)}`, priceX, y);

        doc.save(`invoice-${order._id.slice(-8).toUpperCase()}.pdf`);
    };

    // ── Loading / Error ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-80">
                    <div className="text-center">
                        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Loading order details...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (!order) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-80 gap-4">
                    <FiAlertCircle className="w-12 h-12 text-red-400" />
                    <p className="text-gray-600">Order not found</p>
                    <button onClick={() => navigate("/admin/orders")}
                        className="text-primary-600 font-semibold hover:underline">
                        ← Back to Orders
                    </button>
                </div>
            </AdminLayout>
        );
    }

    const validNext = VALID_TRANSITIONS[order.status] || [];
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["Pending Payment"];

    return (
        <AdminLayout>
            <div className="animate-fade-in space-y-5">

                {/* ── Top Header ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/admin/orders")}
                            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all">
                            <FiArrowLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-outfit font-bold text-gray-900">
                                Order #{order._id.slice(-8).toUpperCase()}
                            </h1>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(order.createdAt).toLocaleString("en-IN", {
                                    day: "numeric", month: "long", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                })}
                            </p>
                        </div>
                        <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={downloadInvoice}
                            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all">
                            <FiDownload className="w-4 h-4" /> Invoice PDF
                        </button>
                        <button onClick={() => window.print()}
                            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all">
                            <FiPrinter className="w-4 h-4" /> Print
                        </button>
                    </div>
                </div>

                {/* ── Main Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* ── Left Column (2/3) ── */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Customer Info */}
                        <Card title="Customer Information" icon={FiUser}>
                            <div className="space-y-3">
                                <InfoRow label="Full Name" value={order.user?.name} />
                                <InfoRow label="Email" value={order.user?.email} />
                                <InfoRow label="Phone" value={order.user?.phone || order.shippingAddress?.phone} />
                                <InfoRow label="User ID" value={order.user?._id} mono />
                            </div>
                            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Shipping Address</p>
                                    <div className="text-sm text-gray-700 space-y-1 bg-gray-50 rounded-xl p-3">
                                        {order.shippingAddress?.fullName && <p className="font-semibold">{order.shippingAddress.fullName}</p>}
                                        <p>{order.shippingAddress?.address}</p>
                                        <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}</p>
                                        <p>{order.shippingAddress?.country}</p>
                                        <p className="font-medium pt-1">📞 {order.shippingAddress?.phone}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Billing Address</p>
                                    <div className="text-sm text-gray-700 space-y-1 bg-gray-50 rounded-xl p-3">
                                        {order.billingAddress?.sameAsShipping !== false ? (
                                            <p className="text-gray-400 italic text-xs">Same as shipping address</p>
                                        ) : (
                                            <>
                                                <p>{order.billingAddress?.address}</p>
                                                <p>{order.billingAddress?.city}, {order.billingAddress?.postalCode}</p>
                                                <p>{order.billingAddress?.country}</p>
                                                <p className="font-medium pt-1">📞 {order.billingAddress?.phone}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Order Items */}
                        <Card title="Order Items" icon={FiPackage}>
                            <div className="divide-y divide-gray-50">
                                {order.orderItems?.map((item, i) => (
                                    <div key={i} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                        <img src={item.image} alt={item.name}
                                            className="w-16 h-20 object-cover rounded-xl border border-gray-100 shrink-0"
                                            onError={(e) => { e.target.src = "https://placehold.co/64x80"; }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {item.size && (
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                                        Size: {item.size}
                                                    </span>
                                                )}
                                                {item.color && (
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                                        Color: {item.color}
                                                    </span>
                                                )}
                                                {item.sku && (
                                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-mono">
                                                        SKU: {item.sku}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                <span>Qty: <strong className="text-gray-800">{item.qty}</strong></span>
                                                <span>Price: <strong className="text-gray-800">₹{item.price?.toLocaleString("en-IN")}</strong></span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-gray-900">₹{(item.qty * item.price)?.toLocaleString("en-IN")}</p>
                                            <p className="text-xs text-gray-400 mt-1">subtotal</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Pricing Breakdown */}
                        <Card title="Pricing Breakdown" icon={FiCreditCard}>
                            <div className="space-y-2">
                                {[
                                    { label: "Subtotal", value: `₹${order.itemsPrice?.toLocaleString("en-IN")}` },
                                    ...(order.couponDiscount > 0 ? [{ label: `Coupon (${order.couponCode})`, value: `-₹${order.couponDiscount?.toLocaleString("en-IN")}`, green: true }] : []),
                                    ...(order.discountPrice > 0 ? [{ label: "Discount", value: `-₹${order.discountPrice?.toLocaleString("en-IN")}`, green: true }] : []),
                                    { label: "Shipping", value: `₹${order.shippingPrice?.toLocaleString("en-IN")}` },
                                    { label: "Tax (GST)", value: `₹${order.taxPrice?.toLocaleString("en-IN")}` },
                                ].map(({ label, value, green }) => (
                                    <div key={label} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">{label}</span>
                                        <span className={green ? "text-emerald-600 font-semibold" : "text-gray-700"}>{value}</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between items-center">
                                    <span className="font-bold text-gray-900 text-base">Grand Total</span>
                                    <span className="font-outfit font-black text-xl text-primary-700">
                                        ₹{order.totalPrice?.toLocaleString("en-IN")}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* Order Notes */}
                        {order.orderNotes && (
                            <Card title="Order Notes" icon={FiEdit2}>
                                <p className="text-sm text-gray-600 italic bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    "{order.orderNotes}"
                                </p>
                            </Card>
                        )}

                        {/* Status Timeline */}
                        <Card title="Status Timeline" icon={FiClock}>
                            <StatusTimeline history={order.statusHistory} />
                        </Card>

                    </div>

                    {/* ── Right Column (1/3) ── */}
                    <div className="space-y-5">

                        {/* Payment Details */}
                        <Card title="Payment Details" icon={FiCreditCard}>
                            <div className="space-y-3">
                                <InfoRow label="Method" value={order.paymentMethod} />
                                <InfoRow label="Status" value={order.isPaid ? "✅ Paid" : "❌ Unpaid"} />
                                {order.paidAt && (
                                    <InfoRow label="Paid At" value={new Date(order.paidAt).toLocaleDateString("en-IN")} />
                                )}
                                {order.paymentResult?.transactionId && (
                                    <InfoRow label="Transaction ID" value={order.paymentResult.transactionId} mono />
                                )}
                                {order.paymentResult?.razorpayOrderId && (
                                    <InfoRow label="Gateway Order" value={order.paymentResult.razorpayOrderId} mono />
                                )}
                                {order.paymentResult?.paymentGateway && (
                                    <InfoRow label="Gateway" value={order.paymentResult.paymentGateway} />
                                )}
                                {order.refundStatus !== "None" && order.refundStatus && (
                                    <InfoRow label="Refund Status" value={order.refundStatus} />
                                )}
                                {order.refundAmount > 0 && (
                                    <InfoRow label="Refund Amount" value={`₹${order.refundAmount?.toLocaleString("en-IN")}`} />
                                )}
                            </div>
                        </Card>

                        {/* Shipping Tracking */}
                        <Card title="Shipment Tracking" icon={FiTruck}>
                            <div className="space-y-3">
                                <InfoRow label="Courier" value={order.courierName} />
                                <InfoRow label="Tracking #" value={order.trackingNumber} mono />
                                {order.trackingUrl && (
                                    <a href={order.trackingUrl} target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-primary-600 font-semibold hover:underline">
                                        <FiTruck className="w-3.5 h-3.5" /> Track Package →
                                    </a>
                                )}
                                {!order.trackingNumber && !order.courierName && (
                                    <p className="text-xs text-gray-400 italic">No tracking info yet.</p>
                                )}
                            </div>
                        </Card>

                        {/* Update Status */}
                        <Card title="Update Order Status" icon={FiEdit2}>
                            {validNext.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">
                                    No further transitions available for "<strong>{order.status}</strong>".
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-500">
                                        Current: <StatusBadge status={order.status} />
                                    </p>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">New Status</label>
                                        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                                            <option value="">Select status...</option>
                                            {validNext.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    {(newStatus === "Shipped" || order.status === "Shipped") && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Courier Name</label>
                                                <input value={courierName} onChange={(e) => setCourierName(e.target.value)}
                                                    placeholder="e.g. Delhivery, DTDC"
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Tracking Number</label>
                                                <input value={trackingNum} onChange={(e) => setTrackingNum(e.target.value)}
                                                    placeholder="AWB / tracking number"
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono" />
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Note (optional)</label>
                                        <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)}
                                            rows={2} placeholder="Add a note..."
                                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
                                    </div>
                                    <button onClick={handleStatusUpdate} disabled={updating || !newStatus}
                                        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
                                        {updating ? (
                                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</>
                                        ) : (
                                            <><FiCheck className="w-4 h-4" /> Update Status</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </Card>

                        {/* Return / Refund */}
                        {returnReq && (
                            <Card title="Return Request" icon={FiRotateCcw}>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500">Status</span>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${returnReq.status === "Approved" || returnReq.status === "Refunded" ? "bg-green-100 text-green-700" :
                                                returnReq.status === "Rejected" ? "bg-red-100 text-red-700" :
                                                    "bg-yellow-100 text-yellow-700"
                                            }`}>{returnReq.status}</span>
                                    </div>
                                    <InfoRow label="Reason" value={returnReq.reason} />
                                    {returnReq.reasonDetail && <InfoRow label="Details" value={returnReq.reasonDetail} />}
                                    {returnReq.adminNote && <InfoRow label="Admin Note" value={returnReq.adminNote} />}
                                    {returnReq.refundAmount > 0 && <InfoRow label="Refund Amount" value={`₹${returnReq.refundAmount}`} />}

                                    {returnReq.status === "Pending" && (
                                        <div className="space-y-2 pt-2 border-t border-gray-100">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Action</label>
                                                <select value={returnAction} onChange={(e) => setReturnAction(e.target.value)}
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                                                    <option value="">Select action...</option>
                                                    <option value="Approved">Approve Return</option>
                                                    <option value="Rejected">Reject Return</option>
                                                    <option value="Refunded">Approve + Refund</option>
                                                </select>
                                            </div>
                                            {returnAction === "Refunded" && (
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Refund Amount (₹)</label>
                                                    <input type="number" value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)}
                                                        placeholder={order.totalPrice}
                                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Admin Note</label>
                                                <textarea value={returnNote} onChange={(e) => setReturnNote(e.target.value)}
                                                    rows={2} placeholder="Reason for decision..."
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
                                            </div>
                                            <button onClick={handleReturnAction} disabled={returnLoading || !returnAction}
                                                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
                                                {returnLoading ? "Processing..." : "Submit Decision"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminOrderDetails;
