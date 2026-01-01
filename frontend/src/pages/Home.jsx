import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get("/products");
        setProducts(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading amazing products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-violet-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center animate-fade-in">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
            Welcome to RK Saree & Fashion Hub
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-8">
            Discover Premium Fashion for Every Occasion
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/category/Women"
              className="bg-white text-purple-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
            >
              Shop Women
            </Link>
            <Link
              to="/category/Men"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-900 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Shop Men
            </Link>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center animate-fade-in">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Latest Products</h2>
          <p className="text-gray-600 text-lg">Explore our curated collection of premium fashion</p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <Link
                key={product._id}
                to={`/product/${product._id}`}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 transform group-hover:-translate-y-2 group-hover:shadow-2xl border border-gray-100 h-full">
                  <div className="overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xl font-semibold text-gray-900">₹{product.price.toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products available</h3>
            <p className="text-gray-600">We're currently updating our collection. Please check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;