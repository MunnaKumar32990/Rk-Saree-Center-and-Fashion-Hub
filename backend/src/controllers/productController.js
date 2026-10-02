import Product, { SUBCATEGORY_OWNER } from "../models/Product.js";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import { recordAudit } from "../models/AuditLog.js";
import { clearOversold } from "../utils/inventory.js";
import { createBulkNotifications } from "../utils/notify.js";
import { sendBackInStockEmail } from "../utils/emailService.js";
import {
  asString,
  asInt,
  asNumber,
  asEnum,
  asText,
  asObject,
  asObjectId,
  asBool,
  safeContains,
} from "../utils/input.js";

const CATEGORIES = ["Men", "Women", "Kids"];
const SORT_OPTIONS = new Set([
  "price_asc", "price_desc", "rating", "newest", "popular", "discount",
  "price_low_high", "price_high_low",
]);

const intParam = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

/**
 * Buffered product view counters.
 *
 * `viewCount` only ever feeds a "Trending" rail, so a counter that loses a few
 * increments on restart is worthless — while a write per page view is expensive
 * and, worse, contends with the inventory transaction. Batching is strictly
 * better on both axes.
 */
const viewBuffer = new Map();
let flushTimer = null;

const FLUSH_INTERVAL_MS = Number(process.env.VIEW_FLUSH_INTERVAL_MS) || 60_000;
const FLUSH_BATCH_MAX = 500;

export function recordView(productId, n = 1) {
  const key = String(productId);
  viewBuffer.set(key, (viewBuffer.get(key) || 0) + n);
  if (!flushTimer) {
    flushTimer = setInterval(flushViews, FLUSH_INTERVAL_MS);
    // Don't hold the event loop open just for a counter flush.
    flushTimer.unref?.();
  }
}

export async function flushViews() {
  if (viewBuffer.size === 0) return;
  const batch = [...viewBuffer.entries()].slice(0, FLUSH_BATCH_MAX);
  for (const [id, count] of batch) viewBuffer.delete(id);

  try {
    await Promise.all(
      batch.map(([id, count]) =>
        Product.updateOne({ _id: id }, { $inc: { viewCount: count } }).catch(() => {})
      )
    );
  } catch {
    // Counting is non-critical; losing a batch is acceptable.
  }
}

// Flush on shutdown so a deploy doesn't drop the last minute of counts.
process.once("SIGTERM", () => { flushViews().catch(() => {}); });
process.once("SIGINT", () => { flushViews().catch(() => {}); });

/**
 * getProducts
 *
 * Fixes:
 *  - Price sort operated on the raw `price` field while the UI displays the
 *    DISCOUNTED price, so "Sort: price low to high" produced visibly wrong
 *    ordering whenever a product had a discount. Sorting is now done on a
 *    computed effective price via aggregation.
 *  - Regex metacharacters from `keyword` were interpolated raw — a ReDoS
 *    vector. Now escaped.
 *  - Added `occasion` / `fabric` / `colourFamily` filters, which are the
 *    attributes ethnic-wear buyers actually search by.
 *  - Added `.lean()` and a projection: reviews are not needed in a list view,
 *    and shipping them for 12 products at a time is a large, pointless payload.
 */
export const getProducts = asyncHandler(async (req, res) => {
  const { keyword, category, subcategory, color, minPrice, maxPrice, rating, size, sort, featured } =
    req.query;

const page = intParam(req.query.page, 1, 1, 50);
  const limit = intParam(req.query.limit, 12, 1, 60);
  const skip = (page - 1) * limit;

  const query = {};

  if (keyword) {
    const rx = safeContains(keyword);
    query.$or = [
      { name: { $regex: rx } },
      { description: { $regex: rx } },
      { tags: { $regex: rx } },
      { "specs.fabric": { $regex: rx } },
      { "specs.weave": { $regex: rx } },
      { sku: { $regex: rx } },
    ];
  }

  if (category && category !== "All") {
    const cat = asEnum(category, CATEGORIES, "category");
    query.category = cat;
  }
  if (subcategory) query.subcategory = asString(subcategory, "subcategory", { max: 40 });
  if (color) query.colors = { $in: [asString(color, "color", { max: 40 })] };
  if (size) query.sizes = { $in: [asString(size, "size", { max: 40 })] };
  if (featured === "true" || featured === true) query.isFeatured = true;

  if (req.query.occasion) query["specs.occasion"] = asString(req.query.occasion, "occasion", { max: 40 });
  if (req.query.fabric) query["specs.fabric"] = { $regex: safeContains(req.query.fabric) };

  if (minPrice || maxPrice) {
    // Filter on the effective (post-discount) price so the range slider
    // matches what the shopper actually sees.
    query.discountedPriceEffective = {
      $gte: asNumber(minPrice ?? 0, "minPrice", { min: 0, max: 10_000_000 }),
      $lte: asNumber(maxPrice ?? 10_000_000, "maxPrice", { min: 0, max: 10_000_000 }),
    };
  }
  if (rating) query.rating = { $gte: asNumber(rating, "rating", { min: 0, max: 5 }) };

  // Decide whether we need aggregation (price sort on effective price).
  const sortKey = SORT_OPTIONS.has(sort) ? sort : "newest";
  const sortsByEffectivePrice =
    sortKey === "price_asc" || sortKey === "price_low_high" ||
    sortKey === "price_desc" || sortKey === "price_high_low";
  const usingEffectivePriceFilter = Boolean(minPrice || maxPrice);

  if (usingEffectivePriceFilter || sortsByEffectivePrice) {
    const effective = {
      $cond: [
        { $gt: [{ $ifNull: ["$discount", 0] }, 0] },
        { $round: [{ $multiply: ["$price", { $subtract: [1, { $divide: [{ $ifNull: ["$discount", 0] }, 100] }] }] }, 0] },
        "$price",
      ],
    };

    const match = { ...query };
    if (usingEffectivePriceFilter) {
      match.discountedPriceEffective = query.discountedPriceEffective;
      delete match.discountedPriceEffective;
    }

    const sortStage = {
      "price_asc": { discountedPriceEffective: 1, _id: 1 },
      "price_low_high": { discountedPriceEffective: 1, _id: 1 },
      "price_desc": { discountedPriceEffective: -1, _id: 1 },
      "price_high_low": { discountedPriceEffective: -1, _id: 1 },
    }[sortKey] || { createdAt: -1 };

    const [result] = await Product.aggregate([
      { $match: match },
      {
        $addFields: {
          discountedPriceEffective: { $cond: [
            { $gt: [{ $ifNull: ["$discount", 0] }, 0] },
            { $round: [{ $multiply: ["$price", { $subtract: [1, { $divide: [{ $ifNull: ["$discount", 0] }, 100] }] }] }, 0] },
            "$price",
          ] },
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                reviews: 0,
                backInStockSubscribers: 0,
                __v: 0,
              },
            },
          ],
        },
      },
    ]);

    const total = result?.metadata?.[0]?.total || 0;
    return res.json({
      products: (result?.data || []).map((p) => {
        const stock = Number(p.countInStock) || 0;
        const inStock = !p.oversold && stock > 0;
        return {
          ...p,
          discountedPrice: p.discountedPriceEffective,
          savings: Math.max(0, p.price - p.discountedPriceEffective),
          inStock,
          stockLabel: !inStock
            ? "Out of stock"
            : stock <= (p.lowStockThreshold ?? 3)
              ? `Only ${stock} left`
              : "In stock",
        };
      }),
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  }

  const sortMap = {
    newest: { createdAt: -1 },
    rating: { rating: -1, numReviews: -1 },
    popular: { soldCount: -1, viewCount: -1 },
    discount: { discount: -1 },
  };

  /**
   * `.lean()` bypasses schema virtuals, so the storefront would otherwise get
   * products with no `discountedPrice`, no `inStock` and no `stockLabel` — the
   * three fields the product card renders. They are recomputed here so a listing
   * response is shaped exactly like a single-product response.
   */
  const withDerived = (p) => {
    const effective =
      p.discount > 0 ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
    const stock = Number(p.countInStock) || 0;
    const inStock = !p.oversold && stock > 0;
    return {
      ...p,
      discountedPriceEffective: effective,
      discountedPrice: effective,
      savings: Math.max(0, p.price - effective),
      inStock,
      stockLabel: !inStock
        ? "Out of stock"
        : stock <= (p.lowStockThreshold ?? 3)
          ? `Only ${stock} left`
          : "In stock",
    };
  };

  const [total, products] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query)
      .select("-reviews -backInStockSubscribers")
      .sort(sortMap[sortKey] || sortMap.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.json({
    products: products.map(withDerived),
    page,
    pages: Math.ceil(total / limit) || 1,
    total,
  });
});

/** Home-page rails: featured / new / bestsellers. */
export const getTopProducts = asyncHandler(async (req, res) => {
  const limit = intParam(req.query.limit, 8, 1, 24);
  const products = await Product.find({ countInStock: { $gt: 0 }, oversold: { $ne: true } })
    .select("-reviews -backInStockSubscribers")
    .sort({ rating: -1, numReviews: -1, soldCount: -1 })
    .limit(limit)
    .lean();
  res.json(products);
});

/**
 * getProductById
 *
 * Also records the view (used for "Trending") and strips the internal review
 * bookkeeping maps.
 *
 * Deliberately NOT `.lean()`: the schema's virtuals — `discountedPrice`,
 * `inStock`, `stockLabel`, `savings` — are what the storefront renders, and
 * lean() bypasses them, so a lean read returned products with no price and no
 * availability at all. `toJSON` also strips the back-in-stock subscriber list,
 * which lean() would not do.
 */
export const getProductById = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "product id");
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

/**
   * View counting is BUFFERED, not written inline.
   *
   * This used to be a bare `updateOne({ $inc: { viewCount: 1 } })` on the hot
   * path. That is the single largest write load in the application for a
   * browsing-heavy shop — far more than order creation — and it targeted the
   * SAME document that the checkout transaction updates under a
   * `countInStock: { $gte: qty }` guard. During a sale burst, a continuous
   * stream of view writes into an open multi-document transaction causes
   * document-level write conflicts and transaction retries, which is exactly
   * when you can least afford a failed checkout.
   *
   * Buffered in memory and flushed on an interval, so PDP views cost one
   * process-local integer increment.
   */
  recordView(id);
  invalidateFacets();

  // Capture the waitlist count BEFORE the subscriber list is stripped.
  product.backInStockWaitlistCount = product.backInStockSubscribers?.length || 0;
  delete product.backInStockSubscribers;

  // Verified purchases first, then most recent — the ordering a shopper trusts.
  product.reviews = (product.reviews || []).sort((a, b) => {
    if (a.isVerifiedPurchase !== b.isVerifiedPurchase) return a.isVerifiedPurchase ? -1 : 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  res.json(product);
});

// ─── Admin: write operations ──────────────────────────────────────────────────

const stringArray = (value, field, max = 30) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    const err = new Error(`${field} must be a list`);
    err.status = 400;
    throw err;
  }
  return value.slice(0, 40).map((v) => asString(v, field, { max }));
};

/** Recompute rating + breakdown from the review array (single source of truth). */
function recalcRatings(product) {
  const reviews = product.reviews || [];
  const n = reviews.length;
  product.numReviews = n;
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const fitCounts = {};
  let sum = 0;
  for (const r of reviews) {
    const star = Math.max(1, Math.min(5, Math.round(r.rating || 0)));
    breakdown[star] = (breakdown[star] || 0) + 1;
    sum += r.rating || 0;
    if (r.fitFeedback) fitCounts[r.fitFeedback] = (fitCounts[r.fitFeedback] || 0) + 1;
  }
  product.rating = n ? Math.round((sum / n) * 10) / 10 : 0;
  product.ratingBreakdown = breakdown;
  product.reviewCountByFit = fitCounts;
}

const parseSpecs = (raw) => {
  if (raw === undefined || raw === null) return undefined;
  const s = asObject(raw, "specs");
  const num = (v, max) =>
    v === "" || v === null || v === undefined
      ? null
      : asNumber(v, "measurement", { min: 0, max });
  const str = (v) => (v === undefined ? undefined : asString(v, "spec", { max: 200 }));

  return {
    ...(s.fabric !== undefined && { fabric: str(s.fabric) }),
    ...(s.fabricComposition !== undefined && { fabricComposition: str(s.fabricComposition) }),
    ...(s.weave !== undefined && { weave: str(s.weave) }),
    ...(s.zariType !== undefined && { zariType: str(s.zariType) }),
    ...(s.zariFinish !== undefined && { zariFinish: str(s.zariFinish) }),
    ...(s.lengthMeters !== undefined && { lengthMeters: num(s.lengthMeters, 12) }),
    ...(s.widthInches !== undefined && { widthInches: num(s.widthInches, 60) }),
    ...(s.blousePieceIncluded !== undefined && { blousePieceIncluded: asBool(s.blousePieceIncluded) }),
    ...(s.blousePieceMeters !== undefined && { blousePieceMeters: num(s.blousePieceMeters, 3) }),
    ...(s.blousePieceAttached !== undefined && { blousePieceAttached: asBool(s.blousePieceAttached) }),
    ...(s.fallPicoProvided !== undefined && { fallPicoProvided: asBool(s.fallPicoProvided) }),
    ...(s.giTag !== undefined && { giTag: str(s.giTag) }),
    ...(s.silkMark !== undefined && { silkMark: asBool(s.silkMark) }),
    ...(s.hsnCode !== undefined && { hsnCode: str(s.hsnCode) }),
    ...(s.washCare !== undefined && { washCare: str(s.washCare) }),
    ...(s.occasion !== undefined && { occasion: str(s.occasion) }),
    ...(s.colourFamily !== undefined && { colourFamily: str(s.colourFamily) }),
  };
};

export const createProduct = asyncHandler(async (req, res) => {
  const b = asObject(req.body, "request");
  const category = asEnum(b.category, CATEGORIES, "category");
  const subcategory = asString(b.subcategory, "subcategory", { max: 40 });

  // Fail fast with a clear message rather than a schema validation error.
  if (subcategory && SUBCATEGORY_OWNER[subcategory] && SUBCATEGORY_OWNER[subcategory] !== category) {
    res.status(400);
    throw new Error(`"${subcategory}" is a ${SUBCATEGORY_OWNER[subcategory]} category, not ${category}`);
  }

  const product = new Product({
    name: asString(b.name, "name", { max: 160 }),
    image: asString(b.image, "image", { max: 600 }),
    images: stringArray(b.images, "images") || [],
    brand: asString(b.brand, "brand", { max: 100 }) || "RK Saree & Fashion Hub",
    category,
    subcategory,
    description: asText(b.description, "description", 8000),
    price: asNumber(b.price, "price", { min: 0, max: 10_000_000 }),
    discount: asNumber(b.discount ?? 0, "discount", { min: 0, max: 100 }),
    countInStock: asInt(b.countInStock ?? 0, "stock", { min: 0, max: 1_000_000 }),
    lowStockThreshold: asInt(b.lowStockThreshold ?? 3, "threshold", { min: 0, max: 1000 }),
    sizes: stringArray(b.sizes, "sizes") || [],
    colors: stringArray(b.colors, "colors") || [],
    sku: asString(b.sku, "SKU", { max: 60 }),
    isFeatured: asBool(b.isFeatured),
    tags: stringArray(b.tags, "tags") || [],
    specs: parseSpecs(b.specs) || {},
  });

  if (b.colorHex && typeof b.colorHex === "object") {
    product.colorHex = new Map(
      Object.entries(b.colorHex).slice(0, 20).map(([k, v]) => [
        asString(k, "colour", { max: 40 }),
        asString(v, "hex", { max: 10 }),
      ])
    );
  }

  await product.save();
  invalidateFacets();

  recordAudit(req, {
    action: "product.create",
    entity: "Product",
    entityId: String(product._id),
    after: { name: product.name, price: product.price, stock: product.countInStock },
  });

  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "product id");
  const b = asObject(req.body, "request");
  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const before = { price: product.price, countInStock: product.countInStock };

  const category = b.category ? asEnum(b.category, CATEGORIES, "category") : product.category;
  const subcategory = b.subcategory !== undefined
    ? asString(b.subcategory, "subcategory", { max: 40 })
    : product.subcategory;

  if (subcategory && SUBCATEGORY_OWNER[subcategory] && SUBCATEGORY_OWNER[subcategory] !== category) {
    res.status(400);
    throw new Error(`"${subcategory}" is a ${SUBCATEGORY_OWNER[subcategory]} category, not ${category}`);
  }

  // `sku` and `tags` were previously missing from this list, so the admin form
  // submitted them and they were silently discarded.
  const assign = (field, value) => {
    if (value !== undefined) product[field] = value;
  };

  assign("name", b.name !== undefined ? asString(b.name, "name", { max: 160 }) : undefined);
  assign("image", b.image !== undefined ? asString(b.image, "image", { max: 600 }) : undefined);
  assign("images", stringArray(b.images, "images"));
  assign("brand", b.brand !== undefined ? asString(b.brand, "brand", { max: 100 }) : undefined);
  product.category = category;
  product.subcategory = subcategory;
  assign("description", b.description !== undefined ? asText(b.description, "description", 8000) : undefined);
  assign("price", b.price !== undefined ? asNumber(b.price, "price", { min: 0, max: 10_000_000 }) : undefined);
  assign("discount", b.discount !== undefined ? asNumber(b.discount, "discount", { min: 0, max: 100 }) : undefined);
  assign("countInStock", b.countInStock !== undefined ? asInt(b.countInStock, "stock", { min: 0, max: 1_000_000 }) : undefined);
  assign("lowStockThreshold", b.lowStockThreshold !== undefined ? asInt(b.lowStockThreshold, "threshold", { min: 0, max: 1000 }) : undefined);
  assign("sizes", stringArray(b.sizes, "sizes"));
  assign("colors", stringArray(b.colors, "colors"));
  assign("sku", b.sku !== undefined ? asString(b.sku, "SKU", { max: 60 }) : undefined);
  assign("isFeatured", b.isFeatured !== undefined ? asBool(b.isFeatured) : undefined);
  assign("tags", stringArray(b.tags, "tags"));

  if (b.colorHex && typeof b.colorHex === "object") {
    product.colorHex = new Map(
      Object.entries(b.colorHex).slice(0, 20).map(([k, v]) => [
        asString(k, "colour", { max: 40 }),
        asString(v, "hex", { max: 10 }),
      ])
    );
  }

  const specs = parseSpecs(b.specs);
  if (specs) Object.assign(product.specs, specs);

  // Replenishing stock clears the oversold flag and fires the back-in-stock
  // alerts that customers explicitly asked for.
  if (b.countInStock !== undefined) {
    const restocked =
      before.countInStock <= 0 && Number(b.countInStock) > 0;
    await clearOversold(product._id, product.countInStock);

    if (restocked) {
      const waitlist = [...(product.backInStockSubscribers || [])];
      product.backInStockSubscribers = [];
      await product.save();

      for (const sub of waitlist) {
        if (!sub.email) continue;
        sendBackInStockEmail(sub.email, product).catch(() => {});
      }
      if (waitlist.length > 0) {
        console.log(`[restock] ${waitlist.length} subscriber(s) notified for ${product.name}`);
      }
    }
  }

  const updated = await product.save();

  recordAudit(req, {
    action: "product.update",
    entity: "Product",
    entityId: String(product._id),
    before,
    after: { price: updated.price, countInStock: updated.countInStock },
  });

  res.json(updated);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "product id");
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Refuse to orphan live orders — deleting a product referenced by an order
  // breaks that order's detail page and its return/refund path.
  const liveOrders = await Order.countDocuments({
    "orderItems.product": id,
    status: { $nin: ["Delivered", "Cancelled", "Refunded"] },
  });
  if (liveOrders > 0) {
    res.status(409);
    throw new Error(
      `This item appears in ${liveOrders} open order(s). Set stock to 0 instead of deleting it.`
    );
  }

  await product.deleteOne();
  invalidateFacets();

  recordAudit(req, {
    action: "product.delete",
    entity: "Product",
    entityId: String(product._id),
    severity: "warning",
  });

  res.json({ message: "Product removed successfully" });
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const createProductReview = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "product id");
  const rating = asInt(req.body?.rating, "rating", { min: 1, max: 5 });
  const comment = asText(req.body?.comment, "review", 1500);
  const heightCm = req.body?.heightCm
    ? asNumber(req.body.heightCm, "height", { min: 90, max: 220 })
    : null;
  const fitFeedback = req.body?.fitFeedback
    ? asEnum(req.body.fitFeedback, ["Runs Small", "True to Size", "Runs Large"], "fit")
    : "";
  const images = stringArray(req.body?.images, "images", 600) || [];

  if (comment.length < 5) {
    res.status(400);
    throw new Error("Please write a few words about your purchase");
  }

  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.reviews.some((r) => String(r.user) === String(req.user._id))) {
    res.status(400);
    throw new Error("You've already reviewed this item");
  }

  // Verified-purchase badge. Reviews from an actual buyer carry far more
  // weight with Indian shoppers than anonymous ones.
  const purchase = await Order.findOne({
    user: req.user._id,
    "orderItems.product": id,
    isDelivered: true,
  })
    .select("_id")
    .lean();

  product.reviews.push({
    name: req.user.name,
    rating,
    comment,
    user: req.user._id,
    isVerifiedPurchase: Boolean(purchase),
    order: purchase?._id,
    images: images.slice(0, 4),
    fitFeedback,
    heightCm,
  });

  recalcRatings(product);
  await product.save();
  invalidateFacets();

  res.status(201).json({
    message: "Thank you for your review",
    rating: product.rating,
    numReviews: product.numReviews,
  });
});

/** Update or delete a review (owner or admin). */
export const manageReview = asyncHandler(async (req, res) => {
  const productId = asObjectId(req.params.id, "product id");
  const reviewId = asObjectId(req.params.reviewId, "review id");
  const action = asEnum(req.params.action, ["edit", "delete"], "action");

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }
  if (String(review.user) !== String(req.user._id) && !req.user.isAdmin) {
    res.status(403);
    throw new Error("Not authorized to modify this review");
  }

  if (action === "delete") {
    review.deleteOne();
  } else {
    if (!req.user.isAdmin) {
      review.rating = asInt(req.body?.rating, "rating", { min: 1, max: 5 });
      review.comment = asText(req.body?.comment, "review", 1500);
    }
  }

  recalcRatings(product);
  await product.save();
  invalidateFacets();

  res.json({ message: action === "delete" ? "Review deleted" : "Review updated", rating: product.rating });
});

// ─── Back-in-stock notifications ──────────────────────────────────────────────

/**
 * Subscribe to a restock alert.
 *
 * The storefront previously showed a "we'll notify you when it's back" form
 * that collected an email address and then did nothing at all — no API call, no
 * persistence, no email. This is the real implementation.
 */
export const notifyMeWhenBackInStock = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "product id");
  const email = asString(req.body?.email, "email", { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
    res.status(400);
    throw new Error("Enter a valid email address");
  }

  const product = await Product.findById(id).select("name countInStock oversold backInStockSubscribers");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.countInStock > 0 && !product.oversold) {
    res.status(400);
    throw new Error("Good news — this is in stock right now!");
  }

  const already = (product.backInStockSubscribers || []).some((s) => s.email === email);
  if (!already) {
    product.backInStockSubscribers.push({ email });
    await product.save();
  }

  res.json({
    message: "We'll email you the moment it's back in stock",
    alreadySubscribed: already,
  });
});

/** Admin: see who is waiting on a restock. */
export const getRestockSubscribers = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "product id");
  const product = await Product.findById(id)
    .select("name countInStock backInStockSubscribers backInStockWaitlistCount")
    .lean();
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({
    product: product.name,
    stock: product.countInStock,
    waiting: (product.backInStockSubscribers || []).map((s) => ({
      email: s.email,
      since: s.createdAt,
    })),
  });
});

// ─── Sitemap ──────────────────────────────────────────────────────────────────

const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

let sitemapCache = { at: 0, body: "" };
const SITEMAP_TTL_MS = 60 * 60 * 1000;

/**
 * Sitemap.
 *
 * Previously `Product.find({})` with no limit and no cache — a full catalogue
 * scan on every crawler hit. Now bounded, lean, and cached for an hour.
 */
export const getSitemap = asyncHandler(async (_req, res) => {
  if (Date.now() - sitemapCache.at < SITEMAP_TTL_MS && sitemapCache.body) {
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    return res.send(sitemapCache.body);
  }

  const base = (process.env.PUBLIC_URL || process.env.FRONTEND_URL || "https://rksareefashionhub.com").replace(/\/$/, "");
  const safeBase = xmlEscape(base);

  const products = await Product.find({}, "_id category updatedAt")
    .sort({ updatedAt: -1 })
    .limit(50000)
    .lean();

  const staticUrls = [
    { loc: "/", freq: "daily", pri: "1.0" },
    { loc: "/category/Women", freq: "daily", pri: "0.9" },
    { loc: "/category/Women?sub=Sarees", freq: "daily", pri: "0.9" },
    { loc: "/category/Men", freq: "daily", pri: "0.8" },
    { loc: "/category/Kids", freq: "daily", pri: "0.8" },
    { loc: "/shipping", freq: "monthly", pri: "0.7" },
    { loc: "/contact", freq: "monthly", pri: "0.6" },
    { loc: "/privacy", freq: "yearly", pri: "0.3" },
    { loc: "/terms", freq: "yearly", pri: "0.3" },
  ];

  const entry = ({ loc, lastmod, freq, pri }) =>
    `  <url><loc>${safeBase}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += staticUrls.map((u) => entry(u)).join("\n") + "\n";
  for (const p of products) {
    const lastmod = new Date(p.updatedAt || Date.now()).toISOString().slice(0, 10);
    xml += entry({ loc: `/product/${p._id}`, lastmod, freq: "weekly", pri: "0.7" }) + "\n";
  }
  xml += "</urlset>";

  sitemapCache = { at: Date.now(), body: xml };

  res.header("Content-Type", "application/xml; charset=utf-8");
  res.header("Cache-Control", "public, max-age=3600");
  res.status(200).send(xml);
});

// ─── Filter facets ────────────────────────────────────────────────────────────
/**
 * Facet counts for the filter sidebar.
 *
 * This is the most expensive endpoint in the API: five aggregations, two of
 * which `$unwind` the `colors` / `sizes` arrays and then `$group`, over the whole
 * collection. That is 60-200 ms of primary CPU per request, and it cannot be
 * served from an index.
 *
 * It is also, by construction, a denial-of-service primitive — 20-60 requests/
 * second from a single client saturates a MongoDB node.
 *
 * Three layers of defence, in order of importance:
 *   1. Cached. Facets change only when the catalogue does, so a short TTL plus
 *      invalidation on product write makes this effectively free. This mirrors
 *      the TTL cache already used by getSitemap.
 *   2. Rate limited at the route (the global limiter exempts it, so the route
 *      has to carry its own limit).
 *   3. Bounded — hard caps on every unwind so a malformed document can't blow up
 *      the working set.
 */
let facetsCache = { at: 0, data: null };
const FACETS_TTL_MS = Number(process.env.FACETS_CACHE_TTL_MS) || 5 * 60 * 1000;
const UNWIND_CAP = 5000;

export const getProductFacets = asyncHandler(async (_req, res) => {
  // Cheap stale-while-error path: if Mongo is slow we still answer from cache.
  if (Date.now() - facetsCache.at < FACETS_TTL_MS && facetsCache.data) {
    res.set("Cache-Control", "public, max-age=60");
    return res.json(facetsCache.data);
  }

  try {
    const [categories, subcategories, colors, sizes, priceRange] = await Promise.all([
      Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $limit: 20 }]),
      Product.aggregate([
        { $match: { subcategory: { $nin: ["", null] } } },
        { $group: { _id: "$subcategory", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 60 },
      ]),
      // `$limit` before `$unwind` so one pathological product with a huge array
      // can't make the group stage allocate unbounded memory.
      Product.aggregate([
        { $limit: UNWIND_CAP },
        { $unwind: "$colors" },
        { $group: { _id: "$colors", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 30 },
      ]),
      Product.aggregate([
        { $limit: UNWIND_CAP },
        { $unwind: "$sizes" },
        { $group: { _id: "$sizes", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 30 },
      ]),
      Product.aggregate([
        { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
      ]),
    ]);

    const data = {
      categories: categories.map((c) => ({ value: c._id, count: c.count })),
      subcategories: subcategories.filter((s) => s._id).map((s) => ({ value: s._id, count: s.count })),
      colors: colors.map((c) => ({ value: c._id, count: c.count })),
      sizes: sizes.map((s) => ({ value: s._id, count: s.count })),
      priceRange: {
        min: Math.floor(priceRange[0]?.min || 0),
        max: Math.ceil(priceRange[0]?.max || 10000),
      },
    };

    facetsCache = { at: Date.now(), data };
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json(data);
  } catch (err) {
    // Serve stale rather than 503 — a filter sidebar failing is not worth
    // blocking the whole product page for.
    if (facetsCache.data) {
      res.set("Cache-Control", "public, max-age=30");
      return res.json(facetsCache.data);
    }
    res.status(503).json({ message: "Filters are temporarily unavailable" });
  }
});

/** Invalidate the facet cache whenever the catalogue changes. */
export const invalidateFacets = () => {
  facetsCache = { at: 0, data: null };
};

export const getLowStockProducts = asyncHandler(async (req, res) => {
  const threshold = intParam(req.query.threshold, 3, 0, 50);
  const products = await Product.find({
    countInStock: { $lte: threshold },
  })
    .select("name sku category subcategory countInStock price discount image images lowStockThreshold")
    .sort({ countInStock: 1 })
    .limit(20)
    .lean();

  res.json(products);
});