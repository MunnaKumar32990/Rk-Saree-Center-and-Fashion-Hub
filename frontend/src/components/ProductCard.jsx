import { Link, useNavigate } from "react-router-dom";
import { FiHeart, FiShoppingCart, FiStar } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { cardImage, productAlt, responsiveSrcSet } from "../utils/cloudinary";
import { effectiveUnitPrice, formatPrice } from "../utils/pricing";

/**
 * ProductCard
 *
 * Fixes:
 *
 * 1. Quick Add called `addToCart(product, 1, "")` unconditionally, so a garment
 *    with sizes could be added to the cart with `size: ""` and ordered that way.
 *    ProductDetails correctly blocked this; the grid did not. Now a sized product
 *    routes to the PDP with the size selector focused, which is also the better
 *    conversion path for anything with a size choice.
 *
 * 2. Quick Add was inside an `opacity-0 group-hover:opacity-100` overlay. There is
 *    no hover on a touch device, so on every phone the control was invisible and
 *    unreachable. Now always visible on touch/small screens.
 *
 * 3. The wishlist toast fired unconditionally after `toggleWishlist`, which
 *    swallowed failures — a 500 still showed "Added to wishlist! ❤️". Now it
 *    reports what actually happened.
 *
 * 4. Icon-only buttons had no accessible name (WCAG 4.1.2 failure).
 *
 * 5. Stock badge used `countInStock === 0` only, ignoring the `oversold` flag
 *    that guards against concurrency-driven overselling.
 */
const ProductCard = ({ product, delay = 0 }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { userInfo } = useAuth();

  const isLiked = isWishlisted(product._id);
  const price = effectiveUnitPrice(product);
  const hasDiscount = Number(product.discount) > 0;
  const stock = Number(product.countInStock) || 0;
  const soldOut = stock <= 0 || Boolean(product.oversold);
  const lowStock = !soldOut && stock <= (Number(product.lowStockThreshold) || 3);
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (soldOut) return;

    if (hasSizes || (Array.isArray(product.colors) && product.colors.length > 0)) {
      // Send them to the PDP where the size or color can actually be chosen.
      navigate(`/product/${product._id}?needSize=1`);
      return;
    }

    const result = addToCart(product, 1, "", "");
    if (!result.ok) {
      toast.error(
        result.reason === "max_stock"
          ? `Only ${result.available} available`
          : "This item just sold out"
      );
      return;
    }

    toast.success(`${product.name} added to cart`, {
      icon: "🛒",
      style: { borderRadius: "12px" },
    });
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userInfo?.token) {
      toast("Sign in to save items to your wishlist", { icon: "🔖" });
      return;
    }

    const nowSaved = await toggleWishlist(product._id);
    if (nowSaved === null) return; // network failure — context already rolled back
    toast.success(nowSaved ? "Saved to wishlist" : "Removed from wishlist", {
      icon: nowSaved ? "❤️" : "💔",
      style: { borderRadius: "12px" },
    });
  };

  return (
    <article
      className="group animate-fade-in h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-brand-lg transition-all duration-300 border border-gray-100/80 relative">
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start pointer-events-none">
          {hasDiscount && (
            <span className="bg-accent-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
              −{product.discount}%
            </span>
          )}

          {lowStock && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
              Only {stock} left
            </span>
          )}

          {soldOut && (
            <span className="bg-stone-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
              Sold out
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={
            isLiked
              ? `Remove ${product.name} from wishlist`
              : `Save ${product.name} to wishlist`
          }
          aria-pressed={isLiked}
          className={`absolute top-2.5 right-2.5 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 ${
            isLiked
              ? "bg-accent-500 text-white"
              : "bg-white/90 text-gray-500 hover:text-accent-500"
          }`}
        >
          {isLiked ? (
            <FaHeart className="w-4 h-4" aria-hidden="true" />
          ) : (
            <FiHeart className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        <Link
          to={`/product/${product._id}`}
          className="block overflow-hidden aspect-[3/4] relative bg-stone-100"
        >
          <img
            src={cardImage(product.image)}
            srcSet={responsiveSrcSet(product.image, [200, 400, 600])}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
            alt={productAlt(product)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            width="400"
            height="533"
          />

          {soldOut && (
            <div className="absolute inset-0 z-10 bg-black/45 flex items-center justify-center">
              <span className="bg-white text-gray-800 font-bold text-xs px-3 py-1.5 rounded-full shadow">
                Sold out
              </span>
            </div>
          )}

          {/* Always reachable on touch devices — hover is not an interaction
              model on a phone. */}
          <div className="absolute inset-x-0 bottom-0 z-10 p-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={soldOut}
              className="w-full flex items-center justify-center gap-2 bg-white text-brand-dark font-semibold px-4 py-2.5 rounded-full text-sm shadow-lg transition-all min-h-[44px] focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 disabled:opacity-60 disabled:cursor-not-allowed sm:opacity-0 sm:translate-y-3 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:hover:bg-primary-500 sm:hover:text-white"
            >
              <FiShoppingCart className="w-4 h-4" aria-hidden="true" />
              {soldOut
                ? "Sold out"
                : hasSizes
                  ? "Choose size"
                  : "Add to cart"}
            </button>
          </div>
        </Link>

        <div className="p-4 flex flex-col flex-grow">
          <Link to={`/product/${product._id}`} className="block">
            {product.subcategory && (
              <p className="text-xs text-primary-500 font-semibold uppercase tracking-wide mb-1">
                {product.subcategory}
              </p>
            )}
            <h3 className="font-outfit font-semibold text-gray-900 text-sm leading-snug line-clamp-2 hover:text-primary-600 transition-colors mb-2">
              {product.name}
            </h3>
          </Link>

          <div className="mt-auto">
            {Number(product.numReviews) > 0 ? (
              <div className="flex items-center gap-1 mb-2">
                <FiStar className="w-3.5 h-3.5 text-gold fill-gold" aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-700">
                  {Number(product.rating).toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">
                  ({product.numReviews} {product.numReviews === 1 ? "review" : "reviews"})
                </span>
              </div>
            ) : (
              // Absence of reviews is itself information; stating it beats a blank.
              <p className="text-xs text-stone-500 mb-2">No reviews yet</p>
            )}

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-outfit font-bold text-base text-gray-900">
                {formatPrice(price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    Save {formatPrice(product.price - price)}
                  </span>
                </>
              )}
            </div>

            {/* The single most effective trust signal on a product card. */}
            <p className="text-xs text-emerald-700 font-medium mt-1.5">
              💵 Cash on Delivery
            </p>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;