import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowRight, FiTruck } from "react-icons/fi";

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, updateQty, removeFromCart, cartTotal, clearCart } = useCart();

  const shippingPrice = cartTotal >= 2000 ? 0 : 150;
  const taxPrice = Math.round(cartTotal * 0.05);
  const orderTotal = cartTotal + shippingPrice + taxPrice;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-brand-bg">
        <div className="text-center py-20">
          <div className="text-8xl mb-6">🛒</div>
          <h2 className="font-outfit text-3xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Discover our amazing collection and add something special</p>
          <Link
            to="/category/Women"
            className="inline-flex items-center gap-2 bg-primary-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-primary-700 transition-all hover:shadow-brand-lg"
          >
            <FiShoppingBag /> Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-outfit text-3xl font-bold text-gray-900">
            Shopping Cart <span className="text-lg text-gray-400 font-normal">({cartItems.length} items)</span>
          </h1>
          <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1.5">
            <FiTrash2 className="w-4 h-4" /> Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.cartKey}
                className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex gap-4 animate-fade-in"
              >
                <Link to={`/product/${item._id}`} className="flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-28 sm:w-32 sm:h-36 object-cover rounded-xl border border-gray-100"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-primary-500 font-semibold uppercase mb-1">{item.category}</p>
                      <Link to={`/product/${item._id}`}>
                        <h3 className="font-outfit font-semibold text-gray-900 hover:text-primary-600 text-sm sm:text-base leading-snug line-clamp-2">
                          {item.name}
                        </h3>
                      </Link>
                      {item.size && (
                        <span className="inline-block mt-2 text-xs border border-gray-200 text-gray-600 px-2.5 py-0.5 rounded-lg font-medium">
                          Size: {item.size}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.cartKey)}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => updateQty(item.cartKey, item.qty - 1)}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        <FiMinus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center font-semibold text-sm text-gray-900">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.cartKey, item.qty + 1)}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        <FiPlus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-outfit font-bold text-gray-900">
                        ₹{(item.price * item.qty).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-gray-400">₹{item.price.toLocaleString("en-IN")} each</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 sticky top-24">
              <h2 className="font-outfit text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              {/* Free shipping progress */}
              {cartTotal < 2000 && (
                <div className="bg-primary-50 rounded-xl p-4 mb-5 border border-primary-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FiTruck className="w-4 h-4 text-primary-600" />
                    <p className="text-xs font-medium text-primary-700">
                      Add ₹{(2000 - cartTotal).toLocaleString("en-IN")} more for FREE delivery!
                    </p>
                  </div>
                  <div className="w-full h-1.5 bg-primary-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (cartTotal / 2000) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({cartItems.reduce((a, b) => a + b.qty, 0)} items)</span>
                  <span className="font-medium text-gray-900">₹{cartTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className={`font-medium ${shippingPrice === 0 ? "text-green-600" : "text-gray-900"}`}>
                    {shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST (5%)</span>
                  <span className="font-medium text-gray-900">₹{taxPrice.toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-outfit font-bold text-gray-900">Total</span>
                  <span className="font-outfit font-black text-xl text-gray-900">₹{orderTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/checkout")}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-4 rounded-2xl hover:shadow-brand-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Proceed to Checkout <FiArrowRight />
              </button>

              <Link to="/category/Women" className="block text-center text-sm text-primary-600 font-medium mt-4 hover:underline">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
