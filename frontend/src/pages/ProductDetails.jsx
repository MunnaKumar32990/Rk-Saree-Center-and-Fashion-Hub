import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    // Show visual feedback
    const button = document.querySelector('.add-to-cart-btn');
    if (button) {
      button.classList.add('animate-bounce-subtle');
      setTimeout(() => button.classList.remove('animate-bounce-subtle'), 600);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Product not found</p>
          <button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-violet-600 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 p-6 sm:p-8 lg:p-12">
            {/* Product Image */}
            <div className="relative overflow-hidden rounded-xl bg-gray-100 group">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Product Info */}
            <div className="flex flex-col justify-center space-y-6 animate-slide-up">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                  {product.name}
                </h1>
                {product.category && (
                  <span className="inline-block bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-1 rounded-full mb-4">
                    {product.category}
                  </span>
                )}
              </div>

              <div className="border-t border-b border-gray-200 py-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900">
                    ₹{product.price.toLocaleString()}
                  </span>
                </div>
              </div>

              {product.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-purple-600 transition-colors font-bold text-lg"
                  >
                    −
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-purple-600 transition-colors font-bold text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                className="add-to-cart-btn w-full bg-gradient-to-r from-purple-700 to-violet-700 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                Add to Cart
              </button>

              <button
                onClick={() => {
                  addToCart(product, quantity);
                  navigate("/cart");
                }}
                className="w-full bg-gray-100 text-black py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-gray-300"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
