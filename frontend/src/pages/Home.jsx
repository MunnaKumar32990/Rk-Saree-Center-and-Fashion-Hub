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

  if (loading) return <div className="p-8 text-center text-xl animate-pulse">Loading amazing sarees...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-8 text-gray-800 border-b-2 border-black inline-block">Latest Products</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {products.length > 0 ? (
          products.map((product) => (
            <Link key={product._id} to={`/product/${product._id}`} className="group">
              <div className="bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 transform group-hover:-translate-y-2 group-hover:shadow-2xl border border-gray-100">
                <div className="overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                  <p className="text-xl font-semibold text-gray-900 mt-2">₹{product.price.toLocaleString()}</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-20 text-gray-500 text-lg italic">No products available at the moment.</div>
        )}
      </div>
    </div>
  );
};

export default Home;