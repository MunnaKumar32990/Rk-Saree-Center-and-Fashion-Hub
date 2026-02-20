import { Link } from "react-router-dom";
import { FiHeart, FiShoppingCart, FiStar } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const ProductCard = ({ product, delay = 0 }) => {
    const { addToCart } = useCart();
    const { isWishlisted, toggleWishlist } = useWishlist();
    const { userInfo } = useAuth();

    const isLiked = isWishlisted(product._id);

    const discountedPrice =
        product.discount > 0
            ? product.price * (1 - product.discount / 100)
            : null;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, 1, "");
        toast.success(`${product.name} added to cart!`, {
            icon: "🛒",
            style: { borderRadius: "12px", fontFamily: "Inter, sans-serif" },
        });
    };

    const handleWishlist = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!userInfo) {
            toast.error("Please login to add to wishlist");
            return;
        }
        await toggleWishlist(product._id);
        toast.success(isLiked ? "Removed from wishlist" : "Added to wishlist! ❤️", {
            style: { borderRadius: "12px" },
        });
    };

    return (
        <div
            className="group animate-fade-in"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-brand-lg transition-all duration-400 transform hover:-translate-y-1.5 border border-gray-100/80 relative">
                {/* Discount Badge */}
                {product.discount > 0 && (
                    <div className="absolute top-3 left-3 z-10 bg-accent-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        -{product.discount}%
                    </div>
                )}

                {/* Wishlist Button */}
                <button
                    onClick={handleWishlist}
                    className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${isLiked ? "bg-accent-500 text-white" : "bg-white text-gray-400 hover:text-accent-500"
                        }`}
                >
                    {isLiked ? <FaHeart className="w-4 h-4" /> : <FiHeart className="w-4 h-4" />}
                </button>

                {/* Image */}
                <Link to={`/product/${product._id}`} className="block overflow-hidden aspect-[3/4] relative">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                    {/* Quick Add Overlay */}
                    <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                        <button
                            onClick={handleAddToCart}
                            disabled={product.countInStock === 0}
                            className="flex items-center gap-2 bg-white text-brand-dark font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-primary-500 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
                        >
                            <FiShoppingCart className="w-4 h-4" />
                            {product.countInStock === 0 ? "Out of Stock" : "Quick Add"}
                        </button>
                    </div>
                </Link>

                {/* Info */}
                <div className="p-4">
                    <Link to={`/product/${product._id}`}>
                        <p className="text-xs text-primary-500 font-semibold uppercase tracking-wide mb-1">{product.category}</p>
                        <h3 className="font-outfit font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-primary-600 transition-colors mb-2">
                            {product.name}
                        </h3>
                    </Link>

                    {/* Rating */}
                    {product.numReviews > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                            <FiStar className="w-3.5 h-3.5 text-gold fill-gold text-yellow-400" />
                            <span className="text-xs font-semibold text-gray-700">{product.rating?.toFixed(1)}</span>
                            <span className="text-xs text-gray-400">({product.numReviews})</span>
                        </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-2">
                        <span className="font-outfit font-bold text-base text-gray-900">
                            ₹{discountedPrice ? discountedPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : product.price.toLocaleString("en-IN")}
                        </span>
                        {discountedPrice && (
                            <span className="text-xs text-gray-400 line-through">
                                ₹{product.price.toLocaleString("en-IN")}
                            </span>
                        )}
                    </div>

                    {product.countInStock === 0 && (
                        <p className="text-xs text-red-500 font-medium mt-1">Out of Stock</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
