import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "../components/Loader";
import StarRating from "../components/StarRating";
import ProductCard from "../components/ProductCard";
import toast from "react-hot-toast";
import { FiHeart, FiShoppingCart, FiPackage, FiArrowLeft } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { userInfo } = useAuth();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [qty, setQty] = useState(1);

  // Review state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLiked = product ? isWishlisted(product._id) : false;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
        // Fetch related
        const rel = await api.get(`/products?category=${data.category}&limit=4`);
        setRelated((rel.data.products || rel.data).filter((p) => p._id !== id));
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetch();
    window.scrollTo(0, 0);
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!selectedSize && product.sizes?.length > 0) {
      toast.error("Please select a size");
      return;
    }
    addToCart(product, qty, selectedSize);
    toast.success("Added to cart! 🛒", { style: { borderRadius: "12px" } });
  };

  const handleWishlist = async () => {
    if (!userInfo) { toast.error("Please login first"); return; }
    await toggleWishlist(product._id);
    toast.success(isLiked ? "Removed from wishlist" : "Saved to wishlist ❤️");
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { toast.error("Please select a rating"); return; }
    setSubmitting(true);
    try {
      await api.post(`/products/${id}/reviews`, { rating, comment });
      toast.success("Review submitted!");
      const { data } = await api.get(`/products/${id}`);
      setProduct(data);
      setRating(0);
      setComment("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Review failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader text="Loading product..." />;
  if (!product) return null;

  const images = [product.image, ...(product.images || [])].filter(Boolean);
  const discountedPrice = product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : null;

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <span>/</span>
          <Link to={`/category/${product.category}`} className="hover:text-primary-600">{product.category}</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">{product.name}</span>
        </nav>

        {/* Product Main */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Images */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 aspect-[3/4] relative group">
              <img
                src={images[selectedImg]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {product.discount > 0 && (
                <div className="absolute top-4 left-4 bg-accent-500 text-white text-sm font-bold px-3 py-1.5 rounded-full">
                  -{product.discount}% OFF
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-all ${selectedImg === i ? "border-primary-500" : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="mb-2">
              <span className="text-primary-600 text-sm font-semibold uppercase tracking-wide">{product.category}</span>
              {product.brand && <span className="text-gray-400 text-sm"> · {product.brand}</span>}
            </div>

            <h1 className="font-outfit text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            {product.numReviews > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <StarRating rating={product.rating} numReviews={product.numReviews} size="md" />
              </div>
            )}

            {/* Price */}
            <div className="flex items-end gap-3 mb-6">
              <span className="font-outfit font-black text-4xl text-gray-900">
                ₹{(discountedPrice || product.price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
              {discountedPrice && (
                <span className="text-gray-400 line-through text-xl mb-1">₹{product.price.toLocaleString("en-IN")}</span>
              )}
              {discountedPrice && (
                <span className="bg-green-100 text-green-700 text-sm font-bold px-2.5 py-1 rounded-lg mb-1">
                  Save ₹{(product.price - discountedPrice).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>

            <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>

            {/* Size Selector */}
            {product.sizes?.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">Size</span>
                  {selectedSize && <span className="text-primary-600 text-sm font-medium">Selected: {selectedSize}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${selectedSize === sz
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-200 text-gray-700 hover:border-primary-400"
                        }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qty + Stock */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 text-lg font-bold">-</button>
                <span className="px-4 py-2.5 font-semibold text-gray-900 min-w-12 text-center">{qty}</span>
                <button onClick={() => setQty(Math.min(product.countInStock, qty + 1))} className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 text-lg font-bold">+</button>
              </div>
              <span className={`text-sm font-medium ${product.countInStock > 0 ? "text-green-600" : "text-red-500"}`}>
                <FiPackage className="inline mr-1" />
                {product.countInStock > 0 ? `${product.countInStock} in stock` : "Out of stock"}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleAddToCart}
                disabled={product.countInStock === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-4 rounded-2xl hover:shadow-brand-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiShoppingCart className="w-5 h-5" /> Add to Cart
              </button>
              <button
                onClick={handleWishlist}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${isLiked ? "border-accent-500 bg-accent-50 text-accent-500" : "border-gray-200 text-gray-400 hover:border-accent-400"
                  }`}
              >
                {isLiked ? <FaHeart className="w-5 h-5" /> : <FiHeart className="w-5 h-5" />}
              </button>
            </div>

            {/* Quick checkout */}
            {product.countInStock > 0 && (
              <button
                onClick={() => { handleAddToCart(); navigate("/cart"); }}
                className="w-full border-2 border-primary-500 text-primary-600 font-bold py-4 rounded-2xl hover:bg-primary-50 transition-all"
              >
                Buy Now
              </button>
            )}
          </div>
        </div>

        {/* ── Reviews Section ──────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-outfit text-2xl font-bold text-gray-900 mb-6">
            Customer Reviews {product.numReviews > 0 && <span className="text-gray-400 text-lg font-normal">({product.numReviews})</span>}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Write Review */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card">
              <h3 className="font-outfit font-semibold text-gray-900 mb-4">Write a Review</h3>
              {!userInfo ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-3">Please login to write a review</p>
                  <Link to="/login" className="text-primary-600 font-semibold hover:underline">Login here</Link>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Your Rating</label>
                    <StarRating rating={rating} interactive onRate={setRating} size="lg" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Comment</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience..."
                      rows={4}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              )}
            </div>

            {/* Review List */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {product.reviews.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">💬</div>
                  <p>No reviews yet. Be the first!</p>
                </div>
              ) : (
                product.reviews.map((review) => (
                  <div key={review._id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                          {review.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{review.name}</span>
                      </div>
                      <StarRating rating={review.rating} size="xs" />
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section>
            <h2 className="font-outfit text-2xl font-bold text-gray-900 mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {related.map((p, i) => <ProductCard key={p._id} product={p} delay={i * 80} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
