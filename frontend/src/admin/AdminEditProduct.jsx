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

  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await api.get(`/products/${id}`);
      setName(data.name);
      setImage(data.image);
      setCategory(data.category);
      setDescription(data.description);
      setPrice(data.price);
      setCountInStock(data.countInStock);
      setSizes(data.sizes.join(", "));
    };

    fetchProduct();
  }, [id]);

  const submitHandler = async (e) => {
    e.preventDefault();

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
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

      <form
        onSubmit={submitHandler}
        className="bg-white p-6 rounded shadow max-w-xl space-y-4"
      >
        <input
          className="w-full border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          className="w-full border p-2 rounded"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          required
        />

        <select
          className="w-full border p-2 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>Women</option>
          <option>Men</option>
          <option>Kids</option>
        </select>

        <textarea
          className="w-full border p-2 rounded"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <input
          type="number"
          className="w-full border p-2 rounded"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <input
          type="number"
          className="w-full border p-2 rounded"
          value={countInStock}
          onChange={(e) => setCountInStock(e.target.value)}
          required
        />

        <input
          className="w-full border p-2 rounded"
          value={sizes}
          onChange={(e) => setSizes(e.target.value)}
        />

        <button
          type="submit"
          className="bg-black text-white px-6 py-2 rounded"
        >
          Update Product
        </button>
      </form>
    </AdminLayout>
  );
};

export default AdminEditProduct;
