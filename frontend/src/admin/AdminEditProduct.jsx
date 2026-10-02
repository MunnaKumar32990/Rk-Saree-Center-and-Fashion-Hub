import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import AdminLayout from "./AdminLayout";
import ProductSpecsEditor from "../components/ProductSpecsEditor";
import toast from "react-hot-toast";
import { FiUpload, FiX, FiImage } from "react-icons/fi";

const CATEGORY_SUBCATEGORY = {
  Men: ["Shirts", "T-Shirts", "Jeans", "Kurtas", "Sherwani", "Shorts", "Pajamas", "Track Pants"],
  Women: ["Sarees", "Lehengas", "Suits", "Kurtis", "Dupatta", "Blouses", "Chunni", "Undergarments"],
  Kids: ["Boys Wear", "Girls Wear", "Kids T-Shirts", "Kids Shorts", "Kurta Sets", "Frocks", "Kids Lehenga"],
};
const CATEGORIES = Object.keys(CATEGORY_SUBCATEGORY);

// ─── Image Upload Widget (reused) ─────────────────────────────────────────────
const ImageUpload = ({ label, value, onChange, multiple = false }) => {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      if (multiple) {
        Array.from(files).forEach((f) => formData.append("images", f));
        const { data } = await api.post("/upload/multiple", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        onChange([...(Array.isArray(value) ? value : []), ...data.urls.map((u) => u.url)]);
      } else {
        formData.append("image", files[0]);
        const { data } = await api.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        onChange(data.url);
      }
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed. Check Cloudinary config.");
    } finally {
      setUploading(false);
    }
  };

  const previews = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all">
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <FiUpload className="w-6 h-6 text-gray-400" />
            <p className="text-xs text-gray-600 font-medium">Click to upload</p>
            <p className="text-xs text-gray-400">JPG, PNG, WEBP</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple={multiple}
          className="hidden" onChange={(e) => handleFile(e.target.files)} />
      </div>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {previews.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="w-16 h-20 object-cover rounded-lg border-2 border-gray-200" />
              <button type="button"
                onClick={(e) => { e.stopPropagation(); multiple ? onChange(previews.filter((_, idx) => idx !== i)) : onChange(""); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <FiX className="w-3 h-3" />
              </button>
            </div>
          ))}
          {multiple && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="w-16 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-all">
              <FiImage className="w-4 h-4" />
              <span className="text-xs mt-1">More</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminEditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("Women");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [countInStock, setCountInStock] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("3");
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState("");
  const [sku, setSku] = useState("");
  const [discount, setDiscount] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [tags, setTags] = useState("");
  const [specs, setSpecs] = useState({});
  const [waiting, setWaiting] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/products/${id}`);
        if (cancelled) return;
        setName(data.name);
        setImage(data.image || "");
        setImages(data.images || []);
        setCategory(data.category);
        setSubcategory(data.subcategory || "");
        setDescription(data.description || "");
        setPrice(data.price);
        setCountInStock(data.countInStock);
        setLowStockThreshold(data.lowStockThreshold ?? 3);
        setSizes(data.sizes || []);
        setColors(data.colors?.join(", ") || "");
        setSku(data.sku || "");
        setDiscount(data.discount || "");
        setIsFeatured(data.isFeatured || false);
        setTags((data.tags || []).join(", "));
        setSpecs(data.specs || {});
      } catch {
        if (!cancelled) setError("Couldn't load this product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProduct();

    // Who is waiting for this to come back. These are real customers whose
    // emails fire the moment stock is replenished.
    api
      .get(`/products/${id}/restock-subscribers`)
      .then(({ data }) => !cancelled && setWaiting(data.waiting || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  const salePrice = price && discount
    ? (Number(price) * (1 - Number(discount) / 100)).toFixed(0)
    : null;

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!image) {
      toast.error("Please upload a main product image");
      return;
    }
    if (subcategory === "Sarees" && !specs.lengthMeters) {
      setFieldErrors({ lengthMeters: true });
      toast.error("A saree needs a stated length");
      return;
    }
    setFieldErrors({});
    setError("");
    setSaving(true);

    try {
      const previousStock = Number(countInStock);
      await api.put(`/products/${id}`, {
        name: name.trim(),
        image,
        images: images.length ? images : [image],
        category,
        subcategory,
        description: description.trim(),
        price: Number(price),
        countInStock: Number(countInStock),
        lowStockThreshold: Number(lowStockThreshold) || 3,
        sizes,
        colors: colors ? colors.split(",").map((c) => c.trim()).filter(Boolean) : [],
        sku: sku.trim() || undefined,
        discount: Number(discount) || 0,
        isFeatured,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        specs,
      });

      if (previousStock <= 0 && Number(countInStock) > 0 && waiting.length > 0) {
        toast.success(
          `Product updated — ${waiting.length} back-in-stock alert${waiting.length === 1 ? "" : "s"} emailed out`,
          { duration: 6000, icon: "🔔" }
        );
      } else {
        toast.success("Product updated");
      }
      navigate("/admin/products");
    } catch (err) {
      const message =
        err.response?.data?.message || err.friendlyMessage || "Failed to update product";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/admin/products")}
            className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">← Back</button>
          <h1 className="text-2xl font-outfit font-bold text-gray-900">Edit Product</h1>
        </div>

        <form onSubmit={submitHandler} className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
          {/* ── Left ── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Basic Information</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
                <input className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <textarea className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm h-28 resize-none"
                  value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                  <select value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm">
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategory</label>
                  <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm">
                    <option value="">-- Select Subcategory --</option>
                    {(CATEGORY_SUBCATEGORY[category] || []).map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SKU</label>
                  <input className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm font-mono"
                    value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹) *</label>
                  <input type="number" min="0" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                    value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Discount (%)</label>
                  <input type="number" min="0" max="100" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                    value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  {salePrice && <p className="text-xs text-emerald-600 font-semibold mt-1">Sale: ₹{Number(salePrice).toLocaleString("en-IN")}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Quantity *</label>
                <input type="number" min="0" className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  value={countInStock} onChange={(e) => setCountInStock(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sizes</label>
                  <div className="flex flex-wrap gap-2">
                    {["Free Size", "S", "M", "L", "XL", "XXL"].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSizes(prev =>
                          prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                        )}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${sizes.includes(size)
                            ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600"
                          }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {sizes.length > 0 && (
                    <p className="text-xs text-primary-600 font-semibold mt-2">Selected: {sizes.join(", ")}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Colors (comma-separated)</label>
                  <input className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                    placeholder="Red, Blue, Green" value={colors} onChange={(e) => setColors(e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm font-semibold text-gray-700">Feature on Home page</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-low-stock" className="block text-sm font-semibold text-gray-700 mb-2">
                    Low-stock alert at
                  </label>
                  <input
                    id="edit-low-stock"
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="edit-tags" className="block text-sm font-semibold text-gray-700 mb-2">
                    Search tags
                  </label>
                  <input
                    id="edit-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="silk, wedding, handloom"
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            <ProductSpecsEditor
              subcategory={subcategory}
              value={specs}
              onChange={setSpecs}
              errors={fieldErrors}
            />
          </div>
          {/* ── Right ── */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Product Images</h2>
              <ImageUpload label="Main Image *" value={image} onChange={setImage} />
              <ImageUpload label="Additional Images" value={images} onChange={setImages} multiple />
            </div>

            {/* Back-in-stock waitlist. These are real customers who asked to be
                told when this came back — the moment stock goes above 0 they
                are emailed automatically, so replenishing here is what converts
                an out-of-stock listing back into sales. */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <span aria-hidden="true">🔔</span>
                Back-in-stock waitlist
                <span className="ml-auto text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                  {waiting.length}
                </span>
              </h2>

              {Number(countInStock) > 0 ? (
                <p className="text-sm text-gray-600 mt-3">
                  This item is in stock. Anyone waiting will be emailed the moment you
                  save — or has already been notified if it was previously zero.
                </p>
              ) : waiting.length === 0 ? (
                <p className="text-sm text-gray-600 mt-3">
                  No one is waiting on this item right now.
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mt-3 mb-2">
                    Set stock above 0 and save — every address below gets an email
                    immediately.
                  </p>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {waiting.map((w, i) => (
                      <li key={`${w.email}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-gray-700">{w.email}</span>
                        <span className="text-gray-400 shrink-0">
                          {w.since ? new Date(w.since).toLocaleDateString("en-IN") : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button type="submit" disabled={saving}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 shadow-md min-h-[48px] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={() => navigate("/admin/products")}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all border border-gray-200 min-h-[48px]">
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminEditProduct;
