import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cardImage, productAlt } from "../utils/cloudinary";
import { formatPrice } from "../utils/pricing";

const STORAGE_KEY = "rk_recently_viewed";
const MAX_ITEMS = 6;

/**
 * useRecentlyViewed — hook that manages a localStorage list of viewed product IDs.
 * Call trackView(product) in ProductDetails to record a view.
 */
export const useRecentlyViewed = () => {
  const getItems = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  };

  const trackView = (product) => {
    if (!product?._id) return;
    const items = getItems().filter((p) => p._id !== product._id);
    const updated = [{ _id: product._id, name: product.name, price: product.price, image: product.image, category: product.category, discount: product.discount }, ...items].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { trackView, getItems };
};

/**
 * RecentlyViewed component — renders a horizontal scrollable grid of
 * recently viewed products, excluding the current product.
 */
const RecentlyViewed = ({ currentProductId }) => {
  const { getItems } = useRecentlyViewed();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const all = getItems().filter((p) => p._id !== currentProductId);
    setItems(all);
  }, [currentProductId]);

  if (items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="inline-block bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
            Your History
          </span>
          <h2 className="font-outfit text-2xl font-bold text-gray-900">Recently Viewed</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((product) => {
          const discountedPrice = product.discount > 0
            ? Math.round(product.price * (1 - product.discount / 100))
            : null;

          return (
            <Link
              key={product._id}
              to={`/product/${product._id}`}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-card hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-[3/4] overflow-hidden bg-gray-50">
                <img
                  src={cardImage(product.image)}
                  alt={productAlt(product)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-500 mb-0.5 capitalize">{product.category}</p>
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{product.name}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-sm font-bold text-gray-900">
                    {formatPrice(discountedPrice || product.price)}
                  </span>
                  {discountedPrice && (
                    <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default RecentlyViewed;
