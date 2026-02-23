import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import {
  FiPackage, FiTruck, FiMapPin, FiClock,
  FiRotateCcw, FiDownload, FiChevronRight, FiAlertCircle
} from "react-icons/fi";

const STATUS_CONFIG = {
  "Pending Payment": { color: "bg-orange-100 text-orange-700", dot: "bg-orange-400", icon: "⏳", step: 0 },
  Paid: { color: "bg-blue-100 text-blue-700", dot: "bg-blue-500", icon: "💳", step: 1 },
  Confirmed: { color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500", icon: "✅", step: 2 },
  Packed: { color: "bg-violet-100 text-violet-700", dot: "bg-violet-500", icon: "📦", step: 3 },
  Shipped: { color: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500", icon: "🚚", step: 4 },
  "Out for Delivery": { color: "bg-purple-100 text-purple-700", dot: "bg-purple-500", icon: "🛵", step: 5 },
  Delivered: { color: "bg-green-100 text-green-700", dot: "bg-green-500", icon: "🎉", step: 6 },
  Returned: { color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500", icon: "↩️", step: 7 },
  Refunded: { color: "bg-teal-100 text-teal-700", dot: "bg-teal-500", icon: "💰", step: 8 },
  Cancelled: { color: "bg-red-100 text-red-700", dot: "bg-red-500", icon: "❌", step: -1 },
};

const DELIVERY_STEPS = ["Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered"];
const RETURN_REASONS = [
  "Wrong product received",
  "Product damaged",
  "Quality issue",
  "Size/colour mismatch",
  "Changed my mind",
  "Other",
];

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [returnReq, setReturnReq] = useState(null);
  const [loading, setLoading] = useState(true);

  // Return form
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
      const ret = await api.get(`/orders/${id}/return`).catch(() => ({ data: null }));
      setReturnReq(ret.data);
    } catch {
      toast.error("Unable to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleReturnRequest = async (e) => {
    e.preventDefault();
    if (!reason) return toast.error("Please select a reason");
    setSubmitting(true);
    try {
      await api.post(`/orders/${id}/return`, { reason, reasonDetail });
      toast.success("Return request submitted successfully!");
      setShowReturnForm(false);
      await fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit return request");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadInvoice = () => {
    if (!order) return;
    const doc = new jsPDF();
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("RK Saree & Fashion Hub", 20, 16);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("INVOICE", 170, 16);
    doc.setTextColor(0, 0, 0);
    let y = 50;
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Order ID: #${order._id.slice(-8).toUpperCase()}`, 20, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    y += 7; doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, 20, y);
    doc.text(`Status: ${order.status}`, 120, y);
    y += 12; doc.line(20, y, 190, y); y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Item", 20, y); doc.text("Qty", 130, y); doc.text("Price", 150, y); doc.text("Total", 175, y);
    y += 5; doc.line(20, y, 190, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    order.orderItems?.forEach((item) => {
      const name = item.name.length > 55 ? item.name.slice(0, 52) + "..." : item.name;
      doc.text(name, 20, y);
      doc.text(String(item.qty), 133, y);
      doc.text(`Rs.${item.price}`, 148, y);
      doc.text(`Rs.${(item.qty * item.price).toFixed(0)}`, 173, y);
      y += 7;
    });
    y += 3; doc.line(20, y, 190, y); y += 8;
    doc.setFontSize(9);
    const rows = [
      ["Subtotal", `Rs.${order.itemsPrice?.toFixed(0)}`],
      ...(order.couponDiscount > 0 ? [[`Coupon (${order.couponCode})`, `-Rs.${order.couponDiscount}`]] : []),
      ["Shipping", `Rs.${order.shippingPrice?.toFixed(0)}`],
      ["Tax", `Rs.${order.taxPrice?.toFixed(0)}`],
    ];
    rows.forEach(([l, v]) => { doc.text(l, 20, y); doc.text(v, 160, y); y += 6; });
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("Grand Total", 20, y); doc.text(`Rs.${order.totalPrice?.toFixed(0)}`, 160, y);
    doc.save(`order-${order._id.slice(-8).toUpperCase()}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading your order...</p>
      </div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <FiAlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-gray-600">Order not found</p>
      <button onClick={() => navigate("/orders")} className="text-primary-600 font-semibold hover:underline">← My Orders</button>
    </div>
  );

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["Pending Payment"];
  const currentStep = DELIVERY_STEPS.indexOf(order.status);
  const isCancelled = order.status === "Cancelled";
  const isDelivered = order.status === "Delivered";
  const canReturn = isDelivered && !returnReq;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/orders")}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all">
                <span className="text-gray-600 text-sm">←</span>
              </button>
              <div>
                <h1 className="font-outfit font-bold text-gray-900">Order #{order._id.slice(-8).toUpperCase()}</h1>
                <p className="text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {order.status}
              </span>
              <button onClick={downloadInvoice}
                className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all">
                <FiDownload className="w-3.5 h-3.5" /> Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Delivery Progress ── */}
        {!isCancelled && !["Returned", "Refunded"].includes(order.status) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 text-sm mb-5">Delivery Progress</h2>
            <div className="flex items-start justify-between relative">
              {/* Progress line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 mx-8">
                <div className="h-0.5 bg-primary-500 transition-all duration-700"
                  style={{ width: currentStep >= 0 ? `${(currentStep / (DELIVERY_STEPS.length - 1)) * 100}%` : "0%" }} />
              </div>
              {DELIVERY_STEPS.map((step, i) => {
                const done = currentStep >= i;
                const active = currentStep === i;
                const stepCfg = STATUS_CONFIG[step];
                return (
                  <div key={step} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-xs ${done ? "bg-primary-600 text-white shadow-lg shadow-primary-200" :
                        "bg-gray-100 text-gray-400"
                      } ${active ? "ring-4 ring-primary-200" : ""}`}>
                      {done ? stepCfg?.icon || "✓" : i + 1}
                    </div>
                    <p className={`text-xs text-center font-medium ${done ? "text-primary-700" : "text-gray-400"}`}>
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Tracking info */}
            {order.trackingNumber && (
              <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Tracking Info</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {order.courierName && <span>{order.courierName} · </span>}
                    <span className="font-mono">{order.trackingNumber}</span>
                  </p>
                </div>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold bg-blue-100 px-3 py-2 rounded-lg hover:bg-blue-200 transition-all">
                    <FiTruck className="w-3.5 h-3.5" /> Track Package <FiChevronRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Items ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <FiPackage className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Order Items ({order.orderItems?.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {order.orderItems?.map((item, i) => (
              <div key={i} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <img src={item.image} alt={item.name}
                  className="w-16 h-20 object-cover rounded-xl border border-gray-100 shrink-0"
                  onError={(e) => { e.target.src = "https://placehold.co/64x80"; }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.size && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">Size: {item.size}</span>}
                    {item.color && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">Color: {item.color}</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Qty: <strong className="text-gray-800">{item.qty}</strong></p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">₹{(item.qty * item.price)?.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-400">₹{item.price?.toLocaleString("en-IN")} each</p>
                </div>
              </div>
            ))}
          </div>

          {/* Price summary */}
          <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>₹{order.itemsPrice?.toLocaleString("en-IN")}</span>
            </div>
            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                <span>Coupon ({order.couponCode})</span>
                <span>-₹{order.couponDiscount?.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>Shipping</span>
              <span>{order.shippingPrice === 0 ? "FREE" : `₹${order.shippingPrice?.toLocaleString("en-IN")}`}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax (GST)</span>
              <span>₹{order.taxPrice?.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-outfit font-black text-base text-gray-900 border-t border-gray-200 pt-2 mt-1">
              <span>Total Paid</span>
              <span className="text-primary-700">₹{order.totalPrice?.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* ── Shipping & Payment ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiMapPin className="w-4 h-4 text-primary-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Delivery Address</h2>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {order.shippingAddress?.fullName && <p className="font-semibold text-gray-900">{order.shippingAddress.fullName}</p>}
              <p>{order.shippingAddress?.address}</p>
              <p>{order.shippingAddress?.city}{order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ""} – {order.shippingAddress?.postalCode}</p>
              <p>{order.shippingAddress?.country}</p>
              <p className="font-medium text-gray-800 pt-1">📞 {order.shippingAddress?.phone}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiClock className="w-4 h-4 text-primary-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Payment Info</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-semibold text-gray-900">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-semibold ${order.isPaid ? "text-emerald-600" : "text-orange-500"}`}>
                  {order.isPaid ? "✅ Paid" : "⌛ Pending"}
                </span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid On</span>
                  <span className="font-semibold text-gray-900">{new Date(order.paidAt).toLocaleDateString("en-IN")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Status Timeline ── */}
        {order.statusHistory?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <FiClock className="w-4 h-4 text-primary-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Order Timeline</h2>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-5">
                {[...order.statusHistory].reverse().map((item, i) => {
                  const sc = STATUS_CONFIG[item.status];
                  return (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 text-xs ${sc?.color || "bg-gray-100 text-gray-600"}`}>
                        {sc?.icon || "•"}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{item.status}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(item.updatedAt).toLocaleString("en-IN", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </div>
                        {item.note && <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Return Request ── */}
        {(canReturn || returnReq) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiRotateCcw className="w-4 h-4 text-primary-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Return & Refund</h2>
            </div>

            {returnReq ? (
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${returnReq.status === "Approved" || returnReq.status === "Refunded" ? "bg-green-100 text-green-700" :
                    returnReq.status === "Rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                  }`}>
                  {returnReq.status === "Pending" ? "⏳" : returnReq.status === "Approved" ? "✅" : returnReq.status === "Rejected" ? "❌" : "💰"} {returnReq.status}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Reason:</strong> {returnReq.reason}</p>
                  {returnReq.reasonDetail && <p className="text-gray-500">{returnReq.reasonDetail}</p>}
                  {returnReq.adminNote && (
                    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1">Response from Store</p>
                      <p className="text-sm text-gray-700">{returnReq.adminNote}</p>
                    </div>
                  )}
                  {returnReq.refundAmount > 0 && (
                    <p className="font-semibold text-emerald-600">Refund Amount: ₹{returnReq.refundAmount?.toLocaleString("en-IN")}</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {!showReturnForm ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-4">
                      Not satisfied with your order? You can request a return within 7 days of delivery.
                    </p>
                    <button onClick={() => setShowReturnForm(true)}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all">
                      <FiRotateCcw className="w-4 h-4" /> Request Return
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReturnRequest} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Reason *</label>
                      <select value={reason} onChange={(e) => setReason(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                        <option value="">Select a reason...</option>
                        {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Details</label>
                      <textarea value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)}
                        rows={3} placeholder="Please describe the issue in detail..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={submitting}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
                        {submitting ? "Submitting..." : "Submit Request"}
                      </button>
                      <button type="button" onClick={() => setShowReturnForm(false)}
                        className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}