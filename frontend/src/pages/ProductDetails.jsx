import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "../components/Loader";
import StarRating from "../components/StarRating";
import ProductCard from "../components/ProductCard";
import SizeGuideModal from "../components/SizeGuideModal";
import SareeSpecs from "../components/SareeSpecs";
import RecentlyViewed, { useRecentlyViewed } from "../components/RecentlyViewed";
import toast from "react-hot-toast";
import Seo, { productSchema, breadcrumbSchema } from "../components/Seo";
import { CodBadge, StockUrgency, DeliveryPromise, ReturnPolicySummary } from "../components/TrustBar";
import { detailImage, thumbImage, productAlt } from "../utils/cloudinary";
import { formatPrice, formatDate } from "../utils/pricing";
import { recordProductView } from "../utils/pwa";
import { FiShoppingCart, FiPackage, FiArrowLeft, FiShare2, FiCheck, FiMessageCircle, FiBell, FiHeart, FiVideo } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import DeliveryPincodeChecker from "../components/DeliveryPincodeChecker";
import SareeDrapeCalculator from "../components/SareeDrapeCalculator";
import ImageMagnifier from "../components/ImageMagnifier";
import { getWhatsAppUrl } from "../utils/contact";

/**
 * ProductDetails — the page where most conversions happen.
 *
 * What changed and why:
 *
 * 1. **The "notify me when it's back" form now actually works.** It previously
 *    collected an email address and then only showed a success toast — no API
 *    call, no storage, no email. There is now a `backInStockSubscribers` queue
 *    on the product and an email that fires when an admin replenishes stock.
 *    For handloom inventory (often one-of-a-kind) this converts dead pages into
 *    sales.
 *
 * 2. **The saree spec sheet** — fabric, weave, zari, length, width, blouse piece,
 *    GI tag / Silk Mark. This is the single biggest differentiator available: it
 *    answers the questions ethnic-wear buyers ask before paying, which
 *    marketplaces largely do not, and every answer reduces a return.
 *
 * 3. **COD badge on the PDP**, not just in checkout. Research specifically
 *    identifies the product page as a bounce-reduction opportunity where an
 *    explicit "COD available" label helps first-time buyers most.
 *
 * 4. **A committed delivery date** rather than nothing at all.
 *
 * 5. **Colour swatches use real hex values.** The old code used the colour
 *    *name* as a CSS background colour, so "Maroon" and "Dark Blue" rendered as
 *    nothing at all — invisible buttons. `colorHex` on the product is used when
 *    present.
 *
 * 6. **Share falls back to WhatsApp** with the product name, price and a
 *    "in stock" claim — the previous fallback opened WhatsApp with no recipient
 *    number, which did nothing useful.
 *
 * 7. **A failed load no longer dumps the user on the homepage.** A 500 or a
 *    dropped connection navigated to `/`, losing the link they were sharing and
 *    their place. There is a proper error state with retry and WhatsApp help.
 *
 * 8. **Related products are fetched in parallel and cancellable**, so rapid
 *    navigation can't leave one product's recommendations under another's name.
 *
 * 9. **Reviews show a verified-purchase badge and fit feedback.** Indian
 *    shoppers distrust generic reviews; a buyer who actually paid carries
 *    weight, and "runs small / true to size" is the information that prevents a
 *    return.
 */
const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { userInfo } = useAuth();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [qty, setQty] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyState, setNotifyState] = useState("idle"); // idle | saving | done
  const [notifyError, setNotifyError] = useState("");

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [fitFeedback, setFitFeedback] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fallPico, setFallPico] = useState(true);
  const [blouseNote, setBlouseNote] = useState("");
  const [showBlouseNote, setShowBlouseNote] = useState(false);

  const { trackView } = useRecentlyViewed();
  const isLiked = product ? isWishlisted(product._id) : false;

  const needsSize = searchParams.get("needSize") === "1";

  // ── Load product + related, in parallel and cancellable ────────────────────
  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setLoadError("");
      try {
        const { data } = await api.get(`/products/${id}`, { signal });
        setProduct(data);

        trackView(data);
        recordProductView();

        // Don't await this before showing the product — the shopper shouldn't
        // wait on recommendations to see what they came for.
        api
          .get(`/products`, {
            params: {
              category: data.category,
              ...(data.subcategory ? { subcategory: data.subcategory } : {}),
              limit: 5,
            },
            signal,
          })
          .then((rel) => {
            const list = rel.data.products || rel.data || [];
            setRelated(list.filter((p) => p._id !== id).slice(0, 4));
          })
          .catch(() => {});
      } catch (err) {
        if (err.code === "ERR_CANCELED" || signal?.aborted) return;
        setLoadError(
          err.response?.data?.message ||
            err.friendlyMessage ||
            "We couldn't load this product."
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id, trackView]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    window.scrollTo(0, 0);
    return () => controller.abort();
  }, [load]);

  const images = product ? [product.image, ...(product.images || [])].filter(Boolean) : [];
  const stock = product ? Number(product.countInStock) || 0 : 0;
  const soldOut = product ? stock <= 0 || Boolean(product.oversold) : false;
  const hasSizes = product?.sizes?.length > 0;
  const price = product
    ? product.discount > 0
      ? Math.round(product.price * (1 - product.discount / 100))
      : product.price
    : 0;
  const maxQty = Math.min(stock, 10);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(
    ({ thenNavigate = false } = {}) => {
      if (!product) return false;
      if (soldOut) {
        toast.error("This item is out of stock");
        return false;
      }
      if (hasSizes && !selectedSize) {
        toast.error("Please choose a size first");
        document.getElementById("size-selector")?.scrollIntoView({ block: "center" });
        return false;
      }
      if (product.colors?.length > 0 && !selectedColor) {
        toast.error("Please choose a colour first");
        return false;
      }

      const customServices = isSaree ? { fallPico, blouseNote: blouseNote.trim() } : null;
      const result = addToCart(
        { ...product, countInStock: stock },
        qty,
        selectedSize,
        selectedColor,
        { customServices }
      );
      if (!result.ok) {
        toast.error(
          result.reason === "max_stock"
            ? `Only ${result.available} available`
            : "This item just sold out"
        );
        return false;
      }

      toast.success(`Added to cart — ${product.name}`, {
        action: { label: "View cart", onClick: () => navigate("/cart") },
      });
      if (thenNavigate) navigate("/cart");
      return true;
    },
    [product, soldOut, hasSizes, selectedSize, selectedColor, addToCart, qty, stock, navigate, isSaree, fallPico, blouseNote]
  );

  const handleWishlist = async () => {
    if (!userInfo?.token) {
      toast("Sign in to save items to your wishlist", { icon: "🔖" });
      navigate("/login", { state: { from: { pathname: `/product/${id}` } } });
      return;
    }
    const nowSaved = await toggleWishlist(product._id);
    toast.success(nowSaved ? "Saved to wishlist" : "Removed from wishlist", {
      icon: nowSaved ? "❤️" : "💔",
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/product/${product._id}`;
    const text = `${product.name} — ${formatPrice(price)}${
      soldOut ? " (currently out of stock)" : ""
    } at RK Saree Center`;

    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text, url });
        return;
      } catch {
        /* user dismissed the sheet */
      }
    }
    // WhatsApp is the primary sharing channel in India, and the previous
    // fallback passed no recipient — it opened a blank composer.
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  };

  // ── Back-in-stock alert (now genuinely wired up) ──────────────────────────
  const submitNotify = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(notifyEmail.trim())) {
      setNotifyError("Enter a valid email address");
      return;
    }

    setNotifyState("saving");
    setNotifyError("");
    try {
      const { data } = await api.post(`/products/${id}/notify-me`, {
        email: notifyEmail.trim().toLowerCase(),
      });
      setNotifyState("done");
      toast.success(data.alreadySubscribed ? "You're already on the list" : "We'll email you the moment it's back", {
        icon: "🔔",
        duration: 5000,
      });
    } catch (err) {
      setNotifyState("idle");
      setNotifyError(err.response?.data?.message || "We couldn't save that. Please try again.");
    }
  };

  // ── Review ────────────────────────────────────────────────────────────────
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error("Please give a star rating");
      return;
    }
    if (comment.trim().length < 5) {
      toast.error("Please write a few words");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/products/${id}/reviews`, {
        rating,
        comment: comment.trim(),
        fitFeedback: fitFeedback || undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
      });
      toast.success(data.rating > 0 ? `Thanks! New average: ${data.rating}★` : "Thanks for your review");
      const refreshed = await api.get(`/products/${id}`);
      setProduct(refreshed.data);
      setRating(0);
      setComment("");
      setFitFeedback("");
      setHeightCm("");
    } catch (err) {
      toast.error(err.response?.data?.message || err.friendlyMessage || "Couldn't submit your review");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) return <PageLoader text="Loading product..." />;

  if (loadError || !product) {
    return (
      <Seo title="Product unavailable" noindex>
        <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4" aria-hidden="true">🔍</div>
            <h1 className="font-outfit text-2xl font-bold text-gray-900 mb-2">
              We couldn't load this product
            </h1>
            <p className="text-gray-500 mb-6">{loadError || "It may have sold out or been removed."}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => load()}
                className="px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 min-h-[48px] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => navigate("/category/Women?sub=Sarees")}
                className="px-6 py-3 rounded-xl border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 min-h-[48px]"
              >
                Browse sarees
              </button>
            </div>
          </div>
        </div>
      </Seo>
    );
  }

  const hasRating = Number(product.numReviews) > 0;
  const discount = Number(product.discount) || 0;
  const isSaree =
    product.subcategory === "Sarees" ||
    product.category === "Sarees" ||
    /saree/i.test(product.name || "") ||
    /saree/i.test(product.category || "");
  const whatsappLink = getWhatsAppUrl(
    `Hi! I'd like to know more about "${product.name}" (₹${price}).${
      soldOut ? " It's showing as out of stock — do you have another in this design?" : ""
    }`
  );

  return (
    <>
      <Seo
        title={product.name}
        description={`${product.name}${
          product.specs?.fabric ? ` — ${product.specs.fabric}` : ""
        }${product.specs?.lengthMeters ? `, ${product.specs.lengthMeters}m` : ""}. ${
          product.specs?.blousePieceIncluded ? "Blouse piece included. " : ""
        }Cash on Delivery available. Free delivery over ₹2,000.`}
        image={product.image}
        url={`/product/${id}`}
        type="product"
        keywords={[product.subcategory, product.specs?.fabric, product.specs?.occasion, product.specs?.weave]
          .filter(Boolean)
          .join(", ")}
        jsonLd={[
          productSchema(product),
          breadcrumbSchema([
            { label: "Home", href: "/" },
            { label: product.category, href: `/category/${product.category}` },
            { label: product.name, href: `/product/${id}` },
          ]),
        ].filter(Boolean)}
      />

      <div className="min-h-screen bg-brand-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* ── Breadcrumb ───────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
            <Link to="/" className="hover:text-primary-600">Home</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/category/${product.category}`} className="hover:text-primary-600">
              {product.category}
            </Link>
            {product.subcategory && (
              <>
                <span aria-hidden="true">/</span>
                <Link
                  to={`/category/${product.category}?sub=${encodeURIComponent(product.subcategory)}`}
                  className="hover:text-primary-600"
                >
                  {product.subcategory}
                </Link>
              </>
            )}
            <span aria-hidden="true">/</span>
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </nav>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-700 mb-4 min-h-[44px] lg:hidden"
          >
            <FiArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
            {/* ── Gallery ──────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 aspect-[3/4] relative">
                <ImageMagnifier
                  src={detailImage(images[selectedImg])}
                  alt={productAlt(product)}
                  className="w-full h-full"
                  badge={
                    <>
                      {discount > 0 && (
                        <div className="absolute top-4 left-4 bg-accent-500 text-white text-sm font-bold px-3 py-1.5 rounded-full pointer-events-none">
                          −{discount}% OFF
                        </div>
                      )}
                      {soldOut && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                          <span className="bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-full shadow">
                            Out of stock
                          </span>
                        </div>
                      )}
                    </>
                  }
                />
              </div>

              {images.length > 1 && (
                <div
                  className="flex gap-3 overflow-x-auto pb-2"
                  role="group"
                  aria-label="Product images"
                >
                  {images.map((img, i) => (
                    <button
                      key={`${img}-${i}`}
                      type="button"
                      onClick={() => setSelectedImg(i)}
                      aria-label={`View image ${i + 1} of ${images.length}`}
                      aria-current={selectedImg === i}
                      className={`flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 ${
                        selectedImg === i ? "border-primary-500" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={thumbImage(img)}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width={80}
                        height={96}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Blouse-piece swatch called out — the competitor-standard practice
                  that resolves the most common confusion in this category. */}
              {isSaree && product.specs?.blousePieceIncluded && images.length > 4 && (
                <p className="text-xs text-stone-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600" aria-hidden="true" />
                  The last photo shows the blouse piece included with this saree.
                </p>
              )}

              {/* Real Daylight Video on WhatsApp helper card */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <FiVideo className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950">Want a real daylight video?</p>
                    <p className="text-[11px] text-emerald-800 truncate">We'll WhatsApp you a video of the real saree fabric &amp; zari.</p>
                  </div>
                </div>
                <a
                  href={getWhatsAppUrl(
                    `Namaste RK Saree Center! Can you please share a quick real daylight video or fabric close-up of "${product?.name}"? SKU: ${product?.specs?.sku || product?._id}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <FiMessageCircle className="w-3.5 h-3.5" /> Video
                </a>
              </div>
            </div>

            {/* ── Buy box ─────────────────────────────────────────────── */}
            <div className="flex flex-col">
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                {product.subcategory && (
                  <Link
                    to={`/category/${product.category}?sub=${encodeURIComponent(product.subcategory)}`}
                    className="text-primary-600 text-sm font-semibold uppercase tracking-wide hover:underline"
                  >
                    {product.subcategory}
                  </Link>
                )}
                {product.specs?.occasion && (
                  <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full">
                    {product.specs.occasion}
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="font-outfit text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                  {product.name}
                </h1>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-shrink-0 w-11 h-11 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
                  aria-label="Share this product on WhatsApp"
                >
                  <FiShare2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {hasRating ? (
                <a href="#reviews" className="flex items-center gap-2 mb-3 inline-flex min-h-[32px]">
                  <StarRating rating={product.rating} numReviews={product.numReviews} size="md" />
                </a>
              ) : (
                <p className="text-sm text-stone-500 mb-3">
                  New arrival — no reviews yet.{" "}
                  <a href="#reviews" className="text-primary-700 underline">Be the first to review</a>
                </p>
              )}

              <div className="flex items-end gap-3 mb-1 flex-wrap">
                <span className="font-outfit font-black text-3xl sm:text-4xl text-gray-900">
                  {formatPrice(price)}
                </span>
                {discount > 0 && (
                  <>
                    <span className="text-gray-400 line-through text-lg mb-1">
                      {formatPrice(product.price)}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-2.5 py-1 rounded-lg mb-1">
                      Save {formatPrice(product.price - price)}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-stone-500 mb-5">Inclusive of all taxes</p>

              {/* Trust signals sit ABOVE the fold on the buy box, where they
                  influence the decision rather than confirming it after. */}
              <div className="flex flex-wrap gap-2 mb-5">
                <CodBadge compact />
                <Link
                  to="/returns"
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200 font-semibold px-3 py-1 text-xs hover:bg-stone-200"
                >
                  ↩️ 7-day returns
                </Link>
                {!soldOut && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200 font-semibold px-3 py-1 text-xs">
                    🔒 Secure payment
                  </span>
                )}
              </div>

              <StockUrgency product={product} className="mb-5" />

              {/* Honest colour disclaimer. "Totally different from the image"
                  is the single most repeated complaint in this category, and
                  the fix is to set the expectation rather than deny it. */}
              <p className="text-xs text-stone-500 mb-5 leading-relaxed">
                Photos are taken in natural daylight. Screen brightness varies by
                device, so colour can look slightly different on your screen. Want
                to see the exact piece first?{" "}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-medium underline"
                >
                  Ask us on WhatsApp
                </a>{" "}
                and we'll send a daylight photo of the actual fabric before you order.
              </p>

              {/* Delivery and COD Checker for PIN code */}
              <DeliveryPincodeChecker className="mb-5" />

              {/* ── Size ───────────────────────────────────────────────── */}
              {hasSizes && (
                <div id="size-selector" className="mb-5 scroll-mt-24">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <span className="text-sm font-semibold text-gray-800">
                      Size {selectedSize && <span className="text-primary-700">· {selectedSize}</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      {needsSize && !selectedSize && (
                        <span className="text-xs text-amber-700 font-medium" role="status">
                          ← Please choose a size
                        </span>
                      )}
                      <Link
                        to="/size-guide"
                        className="flex items-center gap-1 text-xs text-primary-700 hover:underline font-semibold min-h-[32px]"
                      >
                        <FiPackage className="w-3 h-3" aria-hidden="true" /> Size guide
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShowSizeGuide(true)}
                        className="flex items-center gap-1 text-xs text-primary-700 hover:underline font-semibold min-h-[32px]"
                      >
                        Quick chart
                      </button>
                    </div>
                  </div>
                  <div
                    role="group"
                    aria-label="Available sizes"
                    className="flex flex-wrap gap-2"
                  >
                    {product.sizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        aria-pressed={selectedSize === sz}
                        className={`px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all min-h-[44px] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 ${
                          selectedSize === sz
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

              {/* ── Colour ──────────────────────────────────────────────── */}
              {product.colors?.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">Colour</span>
                    {selectedColor && (
                      <span className="text-primary-600 text-sm font-medium">{selectedColor}</span>
                    )}
                  </div>
                  <div role="group" aria-label="Available colours" className="flex flex-wrap gap-3">
                    {product.colors.map((color) => {
                      const hex =
                        product.colorHex?.[color] ||
                        // Fall back to a small palette of real colours so a
                        // colour NAME never gets used as a CSS value (which made
                        // "Maroon" and "Dark Blue" render as invisible buttons).
                        ({ Red: "#dc2626", Maroon: "#7f1d1d", Blue: "#2563eb", Green: "#16a34a",
                           Yellow: "#eab308", Orange: "#f97316", Pink: "#ec4899",
                           Purple: "#9333ea", Black: "#1c1917", White: "#ffffff",
                           Grey: "#6b7280", Beige: "#d6c2a4" }[color] || "#d4d4d8");
                      const selected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          aria-label={color}
                          aria-pressed={selected}
                          onClick={() => setSelectedColor(color)}
                          className={`relative w-11 h-11 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 ${
                            selected
                              ? "border-primary-600 ring-2 ring-primary-200 scale-105"
                              : "border-gray-300 hover:border-primary-400"
                          }`}
                          style={{ backgroundColor: hex }}
                        >
                          {selected && (
                            <span
                              className="absolute inset-0 flex items-center justify-center"
                              aria-hidden="true"
                            >
                              <FiCheck
                                className={`w-4 h-4 ${hex === "#ffffff" ? "text-gray-900" : "text-white"}`}
                                style={{ filter: hex === "#ffffff" ? undefined : "drop-shadow(0 1px 2px rgba(0,0,0,.5))" }}
                              />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Drape Calculator for Sarees ────────────────────────── */}
              {isSaree && (
                <SareeDrapeCalculator
                  sareeLength={product.specs?.lengthMeters ? Number(product.specs.lengthMeters) : 5.5}
                  blouseLength={product.specs?.blousePieceLengthMeters ? Number(product.specs.blousePieceLengthMeters) : 0.8}
                  className="mb-5"
                />
              )}

              {/* ── Complimentary Saree Finishing & Customization ── */}
              {isSaree && (
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 mb-5">
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block mb-2">
                    ✨ Complimentary Saree Finishing
                  </span>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-gray-800">
                    <input
                      type="checkbox"
                      checked={fallPico}
                      onChange={(e) => setFallPico(e.target.checked)}
                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span>Include Free Fall & Pico Finishing (+ ₹0)</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Free
                    </span>
                  </label>
                  <p className="text-[11px] text-gray-500 mt-1 pl-6">
                    Our master tailors will stitch precision fall and interlock pico borders before dispatch.
                  </p>

                  <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 pl-6">
                    {!showBlouseNote ? (
                      <button
                        type="button"
                        onClick={() => setShowBlouseNote(true)}
                        className="text-xs text-primary-700 font-semibold hover:underline"
                      >
                        + Add blouse stitching note or special instructions
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-700 block">
                          Blouse / Customization Request (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Leave blouse unstitched / Sleeves 10 inch"
                          value={blouseNote}
                          onChange={(e) => setBlouseNote(e.target.value)}
                          maxLength={120}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Qty ─────────────────────────────────────────────────── */}
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                    className="px-4 py-3 text-gray-600 hover:bg-gray-50 text-lg font-bold disabled:opacity-40 min-h-[48px] min-w-[48px] focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary-300"
                  >
                    −
                  </button>
                  <span
                    className="px-4 py-3 font-semibold text-gray-900 min-w-12 text-center"
                    aria-live="polite"
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                    aria-label="Increase quantity"
                    className="px-4 py-3 text-gray-600 hover:bg-gray-50 text-lg font-bold disabled:opacity-40 min-h-[48px] min-w-[48px] focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary-300"
                  >
                    +
                  </button>
                </div>
                {!soldOut && (
                  <DeliveryPromise className="flex-1 min-w-[240px]" />
                )}
              </div>

              {/* ── Actions ─────────────────────────────────────────────── */}
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => handleAddToCart()}
                  disabled={soldOut}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-4 rounded-2xl hover:shadow-brand-lg transition-all active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
                >
                  <FiShoppingCart className="w-5 h-5" aria-hidden="true" />
                  {soldOut ? "Out of stock" : "Add to cart"}
                </button>
                <button
                  type="button"
                  onClick={handleWishlist}
                  aria-label={isLiked ? "Remove from wishlist" : "Save to wishlist"}
                  aria-pressed={isLiked}
                  className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300 ${
                    isLiked
                      ? "border-accent-500 bg-accent-50 text-accent-500"
                      : "border-gray-200 text-gray-400 hover:border-accent-400"
                  }`}
                >
                  {isLiked ? <FaHeart className="w-5 h-5" aria-hidden="true" /> : <FiHeart className="w-5 h-5" aria-hidden="true" />}
                </button>
              </div>

              {!soldOut && (
                <button
                  type="button"
                  onClick={() => handleAddToCart({ thenNavigate: true })}
                  className="w-full border-2 border-primary-500 text-primary-700 font-bold py-4 rounded-2xl hover:bg-primary-50 transition-all min-h-[52px] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
                >
                  Buy it now
                </button>
              )}

              {/* WhatsApp Family Sharing Button */}
              <button
                type="button"
                onClick={handleShare}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-2xl text-xs sm:text-sm font-bold hover:bg-emerald-100 transition-all active:scale-[.99]"
              >
                <span>📲</span> Share on WhatsApp with Family (Get Their Opinion)
              </button>

              {/* ── Back in stock ───────────────────────────────────────── */}
              {soldOut && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-5">
                  <p className="font-semibold text-amber-900 text-sm mb-1 flex items-center gap-2">
                    <FiBell className="w-4 h-4" aria-hidden="true" />
                    Currently out of stock
                  </p>
                  <p className="text-amber-800 text-xs mb-4">
                    {product.backInStockWaitlistCount > 0
                      ? `${product.backInStockWaitlistCount} ${product.backInStockWaitlistCount === 1 ? "person is" : "people are"} waiting for this. `
                      : ""}
                    Leave your email and we'll write the moment it's back.
                  </p>

                  {notifyState === "done" ? (
                    <div className="flex items-start gap-2 text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <FiCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-sm font-semibold">
                        You're on the list — we'll email {notifyEmail} the moment this is back.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={submitNotify} noValidate>
                      <label htmlFor="notify-email" className="sr-only">
                        Email address for restock alert
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          id="notify-email"
                          type="email"
                          autoComplete="email"
                          placeholder="your@email.com"
                          value={notifyEmail}
                          onChange={(e) => {
                            setNotifyEmail(e.target.value);
                            setNotifyError("");
                          }}
                          aria-invalid={Boolean(notifyError)}
                          aria-describedby={notifyError ? "notify-error" : undefined}
                          className="flex-1 px-3 py-3 rounded-xl border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[48px]"
                        />
                        <button
                          type="submit"
                          disabled={notifyState === "saving"}
                          className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-all min-h-[48px] disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                        >
                          {notifyState === "saving" ? "Saving…" : "Notify me"}
                        </button>
                      </div>
                      {notifyError && (
                        <p id="notify-error" role="alert" className="text-xs text-red-700 mt-2">
                          {notifyError}
                        </p>
                      )}
                    </form>
                  )}

                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-green-800 text-xs font-semibold hover:underline min-h-[44px]"
                  >
                    <FiMessageCircle className="w-4 h-4" aria-hidden="true" />
                    Or ask us on WhatsApp — we may have another in this design
                  </a>
                </div>
              )}

              {/* ── Ask about this piece ────────────────────────────────── */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm text-emerald-800 font-semibold hover:underline min-h-[44px]"
              >
                <FiMessageCircle className="w-4 h-4" aria-hidden="true" />
                Ask a question about this piece
              </a>

              <ReturnPolicySummary className="mt-5 pt-5 border-t border-stone-200" />
            </div>
          </div>

          {/* ── Specs ──────────────────────────────────────────────────── */}
          {isSaree && (
            <div className="mb-14">
              <SareeSpecs product={product} />
            </div>
          )}

          {/* ── Description ───────────────────────────────────────────── */}
          <section className="mb-14">
            <h2 className="font-outfit text-2xl font-bold text-gray-900 mb-4">Description</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line max-w-3xl">
              {product.description}
            </div>
          </section>

          {/* ── Reviews ───────────────────────────────────────────────── */}
          <section id="reviews" className="mb-16 scroll-mt-24">
            <h2 className="font-outfit text-2xl font-bold text-gray-900 mb-6">
              Customer reviews
              {hasRating && (
                <span className="text-gray-400 text-lg font-normal ml-2">
                  ({product.numReviews})
                </span>
              )}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Write */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card h-fit">
                <h3 className="font-outfit font-semibold text-gray-900 mb-1">Write a review</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Tell other shoppers what arrived, and whether the drape worked for your height.
                </p>

                {!userInfo?.token ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-3">Sign in to write a review</p>
                    <Link
                      to="/login"
                      state={{ from: { pathname: `/product/${id}` } }}
                      className="text-primary-700 font-semibold hover:underline"
                    >
                      Sign in
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700 mb-2 block">Your rating</span>
                      <StarRating rating={rating} interactive onRate={setRating} size="lg" />
                    </div>

                    <div>
                      <label htmlFor="review-comment" className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Your review
                      </label>
                      <textarea
                        id="review-comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="How was the fabric? Did the length suit your height? Was the colour as shown?"
                        rows={4}
                        required
                        maxLength={1500}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Fit feedback is the single most return-preventing review
                        field in apparel. */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fit" className="text-sm font-medium text-gray-700 mb-1.5 block">
                          How did it fit?
                        </label>
                        <select
                          id="fit"
                          value={fitFeedback}
                          onChange={(e) => setFitFeedback(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px]"
                        >
                          <option value="">No answer</option>
                          <option value="Runs Small">Runs small</option>
                          <option value="True to Size">True to size</option>
                          <option value="Runs Large">Runs large</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="height" className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Your height (cm)
                        </label>
                        <input
                          id="height"
                          type="number"
                          inputMode="numeric"
                          min={90}
                          max={220}
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value.replace(/\D/g, "").slice(0, 3))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 min-h-[48px] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
                    >
                      {submitting ? "Submitting…" : "Submit review"}
                    </button>
                  </form>
                )}
              </div>

              {/* List */}
              <div>
                {/* Rating breakdown. Balanced distributions read as more
                    trustworthy than uniformly 5-star, so we show the shape. */}
                {hasRating && product.ratingBreakdown && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-card mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center shrink-0">
                        <p className="font-outfit text-4xl font-bold text-gray-900">
                          {Number(product.rating).toFixed(1)}
                        </p>
                        <StarRating rating={product.rating} size="xs" />
                        <p className="text-xs text-gray-500 mt-1">{product.numReviews} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = product.ratingBreakdown[star] || 0;
                          const pct = product.numReviews ? (count / product.numReviews) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="w-6 text-gray-600 shrink-0">{star}★</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-6 text-gray-400 text-right shrink-0">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {Object.keys(product.reviewCountByFit || {}).length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          How it fitted other buyers
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(product.reviewCountByFit).map(([fit, count]) => (
                            <span
                              key={fit}
                              className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-700"
                            >
                              {fit} · {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {!product.reviews?.length ? (
                    <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
                      <div className="text-4xl mb-2" aria-hidden="true">💬</div>
                      <p className="font-medium text-gray-600">No reviews yet</p>
                      <p className="text-sm mt-1">
                        Be the first — your note could help someone choose confidently.
                      </p>
                    </div>
                  ) : (
                    product.reviews.map((review) => (
                      <article
                        key={review._id}
                        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2 gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              aria-hidden="true"
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold shrink-0"
                            >
                              {review.name?.charAt(0)?.toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <span className="font-semibold text-gray-900 text-sm block truncate">
                                {review.name}
                              </span>
                              {review.isVerifiedPurchase && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                                  <FiCheck className="w-3 h-3" aria-hidden="true" />
                                  Verified purchase
                                </span>
                              )}
                            </div>
                          </div>
                          <StarRating rating={review.rating} size="xs" />
                        </div>

                        <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>

                        {(review.fitFeedback || review.heightCm) && (
                          <p className="mt-2 flex flex-wrap gap-2 text-xs text-stone-600">
                            {review.fitFeedback && (
                              <span className="px-2 py-0.5 rounded bg-stone-100">{review.fitFeedback}</span>
                            )}
                            {review.heightCm && (
                              <span className="px-2 py-0.5 rounded bg-stone-100">
                                Height {review.heightCm} cm
                              </span>
                            )}
                          </p>
                        )}

                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(review.createdAt)}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Related ───────────────────────────────────────────────── */}
          {related.length > 0 && (
            <section>
              <h2 className="font-outfit text-2xl font-bold text-gray-900 mb-6">
                You may also like
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {related.map((p, i) => (
                  <ProductCard key={p._id} product={p} delay={i * 80} />
                ))}
              </div>
            </section>
          )}
        </div>

        <RecentlyViewed currentProductId={id} />

        <SizeGuideModal
          isOpen={showSizeGuide}
          onClose={() => setShowSizeGuide(false)}
          category={product.category}
        />
      </div>
    </>
  );
};

export default ProductDetails;