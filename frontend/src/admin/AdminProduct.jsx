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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
          onClick={() => navigate("/admin/products/add")}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
        >
          Add Product
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product._id} className="border-t">
                <td className="p-3">{product.name}</td>
                <td className="p-3 text-center capitalize">{product.category}</td>
                <td className="p-3 text-center">₹{product.price}</td>
                <td className="p-3 text-center">
                  {/* --- ADDED EDIT BUTTON HERE --- */}
                  <button
                    onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                    className="text-blue-500 hover:text-blue-700 font-medium hover:underline mr-4"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteProduct(product._id)}
                    className="text-red-500 hover:text-red-700 font-medium hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;