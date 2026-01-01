import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import AdminLayout from "./AdminLayout";

const AdminEditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("Women");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [countInStock, setCountInStock] = useState("");
  const [sizes, setSizes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/products/${id}`);
        setName(data.name);
        setImage(data.image);
        setCategory(data.category);
        setDescription(data.description || "");
        setPrice(data.price);
        setCountInStock(data.countInStock);
        setSizes(data.sizes?.join(", ") || "");
      } catch (error) {
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      await api.put(
        `/products/${id}`,
        {
          name,
          image,
          category,
          description,
          price: Number(price),
          countInStock: Number(countInStock),
          sizes: sizes.split(",").map((s) => s.trim()),
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      navigate("/admin/products");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Loading product...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/admin/products")}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
        </div>

        <form
          onSubmit={submitHandler}
          className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-2xl space-y-6"
        >
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Product Name
            </label>
            <input
              className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-purple-600 transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Image URL
            </label>
            <input
              className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-purple-600 transition-colors"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category
            </label>
            <select
              className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-purple-600 transition-colors"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Women</option>
              <option>Men</option>
              <option>Kids</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-black transition-colors h-32 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Price (₹)
              </label>
              <input
                type="number"
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-purple-600 transition-colors"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Stock Quantity
              </label>
              <input
                type="number"
                className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-purple-600 transition-colors"
                value={countInStock}
                onChange={(e) => setCountInStock(e.target.value)}
                required
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sizes (comma separated, e.g. S,M,L,XL)
            </label>
            <input
              className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-purple-600 transition-colors"
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/admin/products")}
              className="flex-1 bg-gray-100 text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 border-2 border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-3 rounded-lg font-bold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? "Updating..." : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminEditProduct;
