import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import jsPDF from "jspdf"; // Import jsPDF

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        setOrder(data);
      } catch (error) {
        console.error("Error fetching order:", error);
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

    doc.line(20, 55, 190, 55); // Horizontal line

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

    // Save the PDF
    doc.save(`invoice-${order._id}.pdf`);
  };

  if (!order) return <div className="p-6">Loading order details...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Order Details</h2>
        
        {/* Download Invoice Button */}
        <button
          onClick={downloadInvoice}
          className="bg-black text-white px-4 py-2 rounded shadow hover:bg-gray-800 transition"
        >
          Download Invoice
        </button>
      </div>

      <div className="bg-white p-6 rounded shadow mb-6 border-l-4 border-black">
        <p className="mb-2"><b>Order ID:</b> {order._id}</p>
        <p className="mb-2"><b>Paid:</b> {order.isPaid ? "✅ Yes" : "❌ No"}</p>
        <p className="mb-2"><b>Delivered:</b> {order.isDelivered ? "✅ Yes" : "❌ No"}</p>
        <p className="text-lg"><b>Total:</b> ₹{order.totalPrice}</p>
      </div>

      <h3 className="text-xl font-semibold mb-4">Items in Order</h3>

      <div className="bg-white rounded shadow overflow-hidden">
        {order.orderItems.map((item) => (
          <div
            key={item.product}
            className="flex items-center gap-6 p-4 border-b last:border-b-0"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 object-cover rounded border"
            />
            <div className="flex-1">
              <p className="font-bold text-lg">{item.name}</p>
              <p className="text-gray-600">
                Quantity: {item.qty} × Price: ₹{item.price}
              </p>
              <p className="font-semibold text-black mt-1">
                Subtotal: ₹{item.qty * item.price}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderDetails;