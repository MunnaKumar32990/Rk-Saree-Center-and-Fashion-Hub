import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AdminLayout from "./AdminLayout";

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  
  const fetchProducts = async () => {
    try {
      const { data } = await api.get("/products");
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await api.delete(`/products/${id}`, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });
      fetchProducts();
    } catch (error) {
      alert("Failed to delete product");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Products Management</h1>
          <button
            onClick={() => navigate("/admin/products/add")}
            className="bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Category</th>
                  <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Price</th>
                  <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-gray-500">
                      No products found. Add your first product to get started.
                    </td>
                  </tr>
                ) : (
                  products.map((product, index) => (
                    <tr
                      key={product._id}
                      className="hover:bg-gray-50 transition-colors duration-200 animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="p-4 font-medium text-gray-900">{product.name}</td>
                      <td className="p-4 text-center">
                        <span className="inline-block bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full capitalize">
                          {product.category}
                        </span>
                      </td>
                      <td className="p-4 text-center font-semibold text-gray-900">₹{product.price.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-all duration-300 hover:scale-105 active:scale-95"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteProduct(product._id)}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-all duration-300 hover:scale-105 active:scale-95"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;