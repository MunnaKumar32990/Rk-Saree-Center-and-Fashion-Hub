import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const { cartItems, removeFromCart, updateQty } = useCart();
  const navigate = useNavigate();
  
  const totalPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="mb-6">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Looks like you haven't added anything to your cart yet.</p>
          <Link
            to="/"
            className="inline-block bg-gradient-to-r from-purple-700 to-violet-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, index) => (
              <div
                key={item._id}
                className="bg-white rounded-xl shadow-md p-6 flex flex-col sm:flex-row gap-6 items-center hover:shadow-lg transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Link
                  to={`/product/${item._id}`}
                  className="flex-shrink-0"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-purple-600 transition-colors"
                  />
                </Link>

                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <Link to={`/product/${item._id}`}>
                    <h4 className="text-lg font-bold text-gray-900 mb-2 hover:text-gray-600 transition-colors">
                      {item.name}
                    </h4>
                  </Link>
                  <p className="text-xl font-semibold text-gray-800 mb-4">
                    ₹{item.price.toLocaleString()}
                  </p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700">Qty:</label>
                      <select
                        value={item.qty}
                        onChange={(e) => updateQty(item._id, Number(e.target.value))}
                        className="border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-600 transition-colors font-semibold"
                      >
                        {[...Array(10).keys()].map((x) => (
                          <option key={x + 1} value={x + 1}>
                            {x + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-lg font-bold text-gray-900">
                      Subtotal: ₹{(item.price * item.qty).toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeFromCart(item._id)}
                  className="flex-shrink-0 bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24 animate-scale-in">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                Order Summary
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Items ({cartItems.reduce((sum, item) => sum + item.qty, 0)})</span>
                  <span className="font-semibold">₹{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span className="font-semibold">
                    {totalPrice > 2000 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      <span>₹100</span>
                    )}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>₹{(totalPrice + (totalPrice > 2000 ? 0 : 100)).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/checkout")}
                className="w-full bg-gradient-to-r from-purple-700 to-violet-700 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl mb-4"
              >
                Proceed to Checkout
              </button>

              <Link
                to="/"
                className="block w-full text-center bg-gray-100 text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 border-2 border-gray-300"
              >
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
