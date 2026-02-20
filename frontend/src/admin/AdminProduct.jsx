import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPackage } from "react-icons/fi";

const CATEGORY_COLORS = {
  Sarees: "bg-pink-100 text-pink-700",
  Suits: "bg-blue-100 text-blue-700",
  Kurtis: "bg-purple-100 text-purple-700",
  Lehengas: "bg-amber-100 text-amber-700",
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/products?limit=200");
      // API returns { products: [...], page, pages } — extract the array
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (error) {
      toast.error("Failed to fetch products");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      fetchProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-0.5">{products.length} total products</p>
          </div>
          <button
            onClick={() => navigate("/admin/products/add")}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-brand active:scale-95"
          >
            <FiPlus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading products...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-16 text-center text-gray-400">
                        <FiPackage className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No products found.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((product) => (
                      <tr key={product._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-12 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-gray-900 text-sm line-clamp-1">{product.name}</p>
                              <p className="text-xs text-gray-400">ID: {product._id?.slice(-6)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${CATEGORY_COLORS[product.category] || "bg-gray-100 text-gray-700"}`}>
                            {product.category}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-outfit font-bold text-gray-900">₹{product.price?.toLocaleString("en-IN")}</span>
                          {product.discount > 0 && (
                            <span className="ml-1 text-xs text-green-600 font-medium">-{product.discount}%</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${product.countInStock > 5
                              ? "bg-green-100 text-green-700"
                              : product.countInStock > 0
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                            {product.countInStock > 0 ? `${product.countInStock} left` : "Out of Stock"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                              className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-100 transition-colors"
                            >
                              <FiEdit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => deleteProduct(product._id, product.name)}
                              className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                            >
                              <FiTrash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;