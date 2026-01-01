import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";

const PlaceOrder = () => {
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const [loading, setLoading] = useState(false);
  const shippingAddress = JSON.parse(localStorage.getItem("shippingAddress"));

  useEffect(() => {
    if (!shippingAddress) {
      navigate("/checkout");
    }
    if (cartItems.length === 0) {
      navigate("/");
    }
  }, [shippingAddress, cartItems.length, navigate]);

  const itemsPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const shippingPrice = itemsPrice > 2000 ? 0 : 100;
  const totalPrice = itemsPrice + shippingPrice;

  const placeOrderHandler = async () => {
    setLoading(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));

      const { data } = await api.post(
        "/orders",
        {
          orderItems: cartItems.map((item) => ({
            name: item.name,
            qty: item.qty,
            image: item.image,
            price: item.price,
            product: item._id,
          })),
          shippingAddress,
          paymentMethod: "Razorpay",
          itemsPrice,
          shippingPrice,
          totalPrice,
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      navigate(`/payment/${data._id}`);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!shippingAddress || cartItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Review Your Order</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
              <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Shipping Address
              </h3>
              <div className="space-y-2 text-gray-700">
                <p className="font-semibold">{shippingAddress.address}</p>
                <p>{shippingAddress.city}, {shippingAddress.postalCode}</p>
                <p>{shippingAddress.country}</p>
                <p className="pt-2">Phone: {shippingAddress.phone}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
              <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                Order Items
              </h3>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.qty} × ₹{item.price.toLocaleString()}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">
                      ₹{(item.price * item.qty).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24 animate-scale-in">
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                Order Summary
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Items ({cartItems.reduce((sum, item) => sum + item.qty, 0)})</span>
                  <span className="font-semibold">₹{itemsPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span className="font-semibold">
                    {shippingPrice === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `₹${shippingPrice}`
                    )}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between text-2xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={placeOrderHandler}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-700 to-violet-700 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                    Processing...
                  </span>
                ) : (
                  "Place Order"
                )}
              </button>

              <button
                onClick={() => navigate("/checkout")}
                className="w-full mt-3 bg-gray-100 text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 border-2 border-gray-300"
              >
                Back to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;
