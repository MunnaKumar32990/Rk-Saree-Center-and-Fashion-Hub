import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import jsPDF from "jspdf";

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/orders/${id}`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        setOrder(data);
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userInfo?.token) {
      fetchOrder();
    }
  }, [id, userInfo?.token]);

  // Function to generate and download PDF invoice
  const downloadInvoice = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("RK Saree & Fashion Hub", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Order ID: ${order._id}`, 20, 30);
    doc.text(`Total Price: ₹${order.totalPrice}`, 20, 40);
    doc.text(`Status: ${order.isPaid ? "Paid" : "Unpaid"}`, 20, 50);

    doc.line(20, 55, 190, 55);

    // Items Table
    let y = 65;
    doc.setFont("helvetica", "bold");
    doc.text("Product Details", 20, y);
    doc.setFont("helvetica", "normal");
    
    y += 10;
    order.orderItems.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.name} - ${item.qty} × ₹${item.price}`,
        20,
        y
      );
      y += 10;
    });

    doc.save(`invoice-${order._id}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Order not found</p>
          <Link
            to="/myorders"
            className="inline-block bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-violet-600 transition-colors"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-900">Order Details</h2>
          
          <button
            onClick={downloadInvoice}
            className="bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Invoice
          </button>
        </div>

        {/* Order Status Card */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-6 border-l-4 border-purple-600 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Order ID</p>
              <p className="font-mono text-sm font-semibold text-gray-900">{order._id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Order Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(order.createdAt || Date.now()).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Status</p>
              {order.isPaid ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  ✓ Paid
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                  ✗ Unpaid
                </span>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Delivery Status</p>
              {order.isDelivered ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  ✓ Delivered
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                  ⏳ Processing
                </span>
              )}
            </div>
            <div className="md:col-span-2 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-gray-900">₹{order.totalPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div className="bg-white p-6 rounded-xl shadow-lg mb-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              Shipping Address
            </h3>
            <div className="text-gray-700 space-y-1">
              <p className="font-semibold">{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && (
                <p className="pt-2">Phone: {order.shippingAddress.phone}</p>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Items in Order</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {order.orderItems.map((item, index) => (
              <div
                key={item.product}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 hover:bg-gray-50 transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg text-gray-900 mb-2">{item.name}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>Quantity: <strong>{item.qty}</strong></span>
                    <span>Price: <strong>₹{item.price.toLocaleString()}</strong></span>
                  </div>
                </div>
                <p className="font-bold text-xl text-gray-900">
                  ₹{(item.qty * item.price).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Link
            to="/myorders"
            className="inline-block bg-gray-100 text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 border-2 border-gray-300"
          >
            ← Back to Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;