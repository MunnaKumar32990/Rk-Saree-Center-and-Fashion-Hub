import { useRef } from "react";
import { FiPrinter, FiX, FiCheck } from "react-icons/fi";

/**
 * ShippingLabelModal
 *
 * Professional 4x6 / A6 standard e-commerce courier dispatch slip.
 * Eliminates manual writing of addresses on courier flyer bags and reduces RTO.
 */
export default function ShippingLabelModal({ order, onClose }) {
  const printRef = useRef(null);

  if (!order) return null;

  const isCod = order.paymentMethod === "COD";
  const orderNumber = order._id.slice(-8).toUpperCase();
  const dateFormatted = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Courier Shipping Label"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3 no-print">
          <div>
            <h3 className="font-outfit font-bold text-gray-900 text-lg">
              Dispatch Shipping Label
            </h3>
            <p className="text-xs text-gray-500">
              Standard 4" x 6" / A6 courier packaging slip
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <FiPrinter className="w-4 h-4" /> Print Label
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Label Sheet */}
        <div
          ref={printRef}
          id="shipping-label-sheet"
          className="border-2 border-dashed border-gray-400 p-4 rounded-xl bg-white text-gray-900 font-sans text-xs print:border-black print:p-2 print:m-0"
        >
          {/* Header Bar */}
          <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
            <div>
              <p className="font-outfit font-black text-base tracking-wide text-black uppercase">
                RK Saree Center
              </p>
              <p className="text-[10px] text-gray-600 font-medium">
                Premium Ethnic Wear &amp; Sarees
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5 rounded">
                ORD #{orderNumber}
              </span>
              <p className="text-[10px] text-gray-500 mt-0.5">{dateFormatted}</p>
            </div>
          </div>

          {/* Courier & Tracking Barcode Section */}
          <div className="border border-black rounded p-2 mb-2 bg-gray-50 flex justify-between items-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">
                Logistics Partner
              </span>
              <span className="font-bold text-sm text-black">
                {order.courierName || "Standard Express Logistics"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">
                AWB / Tracking Number
              </span>
              <span className="font-mono font-bold text-xs">
                {order.trackingNumber || `AWB-${orderNumber}`}
              </span>
            </div>
          </div>

          {/* Huge Payment Instruction Box */}
          <div
            className={`border-2 p-2.5 mb-3 text-center rounded font-bold uppercase tracking-wider ${
              isCod
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-green-700 bg-green-50 text-green-800"
            }`}
          >
            {isCod ? (
              <div>
                <p className="text-sm">💵 CASH ON DELIVERY (COD)</p>
                <p className="text-lg font-black text-red-900">
                  COLLECT: ₹{order.totalPrice?.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] font-normal normal-case text-red-700">
                  Collect cash before handing parcel to consignee
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm">✅ PREPAID ORDER</p>
                <p className="text-base font-black text-green-900">
                  DO NOT COLLECT CASH
                </p>
                <p className="text-[10px] font-normal normal-case text-green-700">
                  Paid online via UPI / Razorpay
                </p>
              </div>
            )}
          </div>

          {/* Consignee (Deliver To) Address */}
          <div className="border-2 border-black p-3 rounded mb-3 bg-white">
            <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">
              DELIVER TO (CONSIGNEE):
            </span>
            <p className="font-black text-sm text-black">
              {order.shippingAddress?.fullName || order.user?.name}
            </p>
            <p className="text-xs font-medium text-gray-800 leading-relaxed mt-0.5">
              {order.shippingAddress?.address}
            </p>
            <div className="mt-1 pt-1 border-t border-gray-200">
              <p className="font-bold text-sm text-black">
                {order.shippingAddress?.city?.toUpperCase()},{" "}
                {order.shippingAddress?.state?.toUpperCase()} —{" "}
                <span className="font-mono text-base font-black underline bg-yellow-200 px-1">
                  {order.shippingAddress?.postalCode}
                </span>
              </p>
              <p className="font-bold text-xs text-black mt-1">
                📞 Contact: {order.shippingAddress?.phone || order.user?.phone}
              </p>
            </div>
          </div>

          {/* Package Content Items */}
          <div className="border border-black rounded p-2 mb-3">
            <span className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
              Package Contents ({order.orderItems?.length || 0} items):
            </span>
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-gray-300 font-bold">
                  <th className="py-0.5">Item</th>
                  <th className="py-0.5">SKU / Size</th>
                  <th className="py-0.5 text-center">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.orderItems?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1 pr-1 font-medium truncate max-w-[160px]">
                      {item.name}
                    </td>
                    <td className="py-1 font-mono text-[10px] text-gray-600">
                      {item.sku || "N/A"}{item.size ? ` / ${item.size}` : ""}
                    </td>
                    <td className="py-1 text-center font-bold">{item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Return To (Shipper) Address */}
          <div className="border-t border-gray-400 pt-2 text-[10px] text-gray-600 flex justify-between items-end">
            <div>
              <span className="font-bold uppercase text-gray-800 block">
                RETURN TO (SENDER):
              </span>
              <p className="font-semibold text-gray-800">
                RK Saree Center &amp; Fashion Hub
              </p>
              <p>Main Market Road, Bihar, India</p>
              <p>Helpline: +91 97087 XXXXX | Email: rksareecenter32@gmail.com</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-[9px] text-gray-400 block">
                Standard E-Com A6 Slip
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
