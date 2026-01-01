import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

const Category = () => {
  const { categoryName } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/products");
        const filtered = data.filter(
          (product) => product.category === categoryName
        );
        setProducts(filtered);
      } catch (error) {
        console.error("Error fetching category products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [categoryName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading {categoryName} collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-4xl font-bold text-gray-900 mb-2 capitalize">
            {categoryName} Collection
          </h2>
          <p className="text-gray-600">
            Discover our curated selection of {categoryName.toLowerCase()} fashion
          </p>
        </div>

        {products.length === 0 ? (
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600 mb-6">
              We're currently updating our {categoryName.toLowerCase()} collection.
            </p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <Link
                key={product._id}
                to={`/product/${product._id}`}
                className="group block no-underline text-inherit animate-fade-in"
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
                    <p className="text-xl font-semibold text-gray-900">
                      ₹{product.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Category;