import mongoose from "mongoose";

const reviewSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 1500 },
    // Review authenticity signals. A verified-bought badge measurably increases
    // trust, and Indian shoppers specifically distrust polished reviews.
    isVerifiedPurchase: { type: Boolean, default: false },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    // Photos of the actual product in natural light
    images: [{ type: String }],
    // Buyer context that drives returns: height, body type, drape fit
    fitFeedback: {
      type: String,
      enum: ["", "Runs Small", "True to Size", "Runs Large"],
      default: "",
    },
    heightCm: { type: Number, default: null, min: 90, max: 220 },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, createdAt: -1 });

/**
 * Saree / ethnic-wear specification block.
 *
 * Research consistently shows the questions ethnic-wear buyers ask *before*
 * paying are: fabric composition, weaving method, zari type, exact
 * measurements, whether a blouse piece is included and how long it is, and
 * whether colour matches the photo. Most sites — including the big
 * marketplaces — answer none of these. Answering them is the cheapest way to
 * beat a marketplace, because they are a genuine information failure and every
 * answer reduces a return.
 */
/**
 * Ownership map for the flat subcategory enum. Without this, a Kids/Sherwani
 * product was accepted because every subcategory is validated against one
 * shared list.
 */
const SUBCATEGORY_OWNER = {
  Shirts: "Men", "T-Shirts": "Men", Jeans: "Men", Kurtas: "Men", Sherwani: "Men",
  Shorts: "Men", Pajamas: "Men", "Track Pants": "Men",
  Sarees: "Women", Lehengas: "Women", Suits: "Women", "Kurtis": "Women",
  Dupatta: "Women", Blouses: "Women", Chunni: "Women", Undergarments: "Women",
  "Boys Wear": "Kids", "Girls Wear": "Kids",
  "Kids T-Shirts": "Kids", "Kids Shorts": "Kids", "Kurta Sets": "Kids",
  Frocks: "Kids", "Kids Lehenga": "Kids",
};

const specsSchema = new mongoose.Schema(  {
    // Fabric
    fabric: { type: String, default: "" },            // e.g. "Banarasi Silk (Katan)"
    fabricComposition: { type: String, default: "" }, // e.g. "100% Mulberry Silk"
    weave: { type: String, default: "" },             // "Handloom" | "Powerloom" | "Machine"
    // Zari
    zariType: { type: String, default: "" },          // "Tested Zari" | "Artificial Zari"
    zariFinish: { type: String, default: "" },        // "Gold" | "Antique Gold" | "Silver"
    // Measurements (metres) — a saree is effectively free-size, so length and
    // width ARE the fit question
    lengthMeters: { type: Number, default: null, min: 0, max: 12 },
    widthInches: { type: Number, default: null, min: 0, max: 60 },
    // Blouse piece — the single most misunderstood attribute in this category.
    // 0.8m makes a short/elbow-sleeve blouse but NOT full sleeves or a deep
    // neckline. Customers who don't know this blame the seller.
    blousePieceIncluded: { type: Boolean, default: false },
    blousePieceMeters: { type: Number, default: null, min: 0, max: 3 },
    blousePieceAttached: { type: Boolean, default: false },
    fallPicoProvided: { type: Boolean, default: false },
    // Authenticity — government-issued, verifiable, and therefore trustworthy
    giTag: { type: String, default: "" },             // e.g. "GI Registry, Varanasi"
    silkMark: { type: Boolean, default: false },
    hsnCode: { type: String, default: "" },           // 5007 = pure silk classification
    // Care
    washCare: { type: String, default: "" },
    // Occasion
    occasion: { type: String, default: "" },          // "Wedding" | "Festive" | "Daily" | "Party"
    colourFamily: { type: String, default: "" },      // powers colour swatch chips
  },
  { _id: false }
);

const backInStockSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    notifiedAt: { type: Date, default: null },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: 160,
    },
    slug: { type: String, trim: true, lowercase: true },
    image: {
      type: String,
      required: [true, "Product image is required"],
    },
    images: [String],
    brand: {
      type: String,
      default: "RK Saree & Fashion Hub",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Men", "Women", "Kids"],
    },
    subcategory: {
      type: String,
      default: "",
      enum: [
        "",
        // Men
        "Shirts", "T-Shirts", "Jeans", "Kurtas", "Sherwani", "Shorts", "Pajamas", "Track Pants",
        // Women
        "Sarees", "Lehengas", "Suits", "Kurtis", "Dupatta", "Blouses", "Chunni", "Undergarments",
        // Kids
        "Boys Wear", "Girls Wear",
        // Kids sub-sub
        "Kids T-Shirts", "Kids Shorts", "Kurta Sets", "Frocks", "Kids Lehenga",
      ],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: 8000,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // Admin-facing reorder alert. Never shown as a customer-facing promise.
    lowStockThreshold: { type: Number, default: 3, min: 0 },
    // Set when concurrency drove stock to zero while orders were in flight, so
    // the storefront can stop selling an item that is no longer real.
    oversold: { type: Boolean, default: false },

    sizes: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    // Colour swatch hex per colour name — lets the PDP show real swatches and
    // reduces the #1 complaint ("totally different from the image") by setting
    // an honest expectation alongside the disclaimer.
    colorHex: {
      type: Map,
      of: String,
      default: {},
    },
    sku: {
      type: String,
      trim: true,
    },
    specs: { type: specsSchema, default: () => ({}) },

    reviews: [reviewSchema],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    // Aggregated review breakdown, kept in sync on every write so the PDP can
    // render the 5→1 star histogram without an aggregation per request.
    ratingBreakdown: {
      type: Map,
      of: Number,
      default: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    },
    reviewCountByFit: {
      type: Map,
      of: Number,
      default: {},
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
    // Drives "New in" / "Trending" rails
    viewCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
    tags: [String],
    backInStockSubscribers: [backInStockSchema],
    /**
     * How many people are waiting for a restock. Exposed on the PDP so the
     * storefront can say "12 people are waiting" — a genuine scarcity signal
     * that also nudges the owner to replenish. Declared as a real path rather
     * than assigned ad hoc, because Mongoose strict mode drops undeclared
     * properties on serialisation.
     */
    backInStockWaitlistCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Previously the only indexes in the entire schema came from `unique: true`.
// Every catalogue query (filter by category, sort by price/rating, paginate by
// recency) was a collection scan.
productSchema.index({ category: 1, subcategory: 1, isFeatured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ numReviews: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1, createdAt: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ sku: 1 }, { sparse: true });
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ "specs.colourFamily": 1 });
productSchema.index({ "specs.occasion": 1 });

/**
 * Reject category/subcategory combinations that don't exist.
 * Without this, `{ category: "Kids", subcategory: "Sherwani" }` was accepted
 * because the subcategory enum is a flat list shared across all genders.
 *
 * Note: Mongoose 9 hooks are promise-based — a hook that declares a `next`
 * parameter is treated as a callback-style hook and throws "next is not a
 * function". `this.invalidate()` adds the error to the ValidationError that
 * `save()` rejects with, so no explicit continuation is needed.
 */
productSchema.pre("validate", function () {
  const sub = this.subcategory;
  if (sub && SUBCATEGORY_OWNER[sub] && this.category !== SUBCATEGORY_OWNER[sub]) {
    this.invalidate(
      "subcategory",
      `"${sub}" belongs to ${SUBCATEGORY_OWNER[sub]}, not ${this.category}`
    );
  }
  // A saree whose measurements are unknown generates returns. Require it.
  if (sub === "Sarees" && !this.specs?.lengthMeters) {
    this.invalidate("specs.lengthMeters", "Length in metres is required for sarees");
  }
});

// Virtual for discounted price
productSchema.virtual("discountedPrice").get(function () {
  if (this.discount > 0) {
    return Math.round(this.price * (1 - this.discount / 100));
  }
  return this.price;
});

productSchema.virtual("savings").get(function () {
  return Math.max(0, Math.round(this.price - this.discountedPrice));
});

productSchema.virtual("inStock").get(function () {
  return !this.oversold && this.countInStock > 0;
});

productSchema.virtual("stockLabel").get(function () {
  if (this.oversold || this.countInStock <= 0) return "Out of stock";
  if (this.countInStock <= (this.lowStockThreshold ?? 3)) {
    return `Only ${this.countInStock} left`;
  }
  return "In stock";
});

// Never leak the back-in-stock subscriber list through the API.
productSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    delete ret.backInStockSubscribers;
    return ret;
  },
});

const Product = mongoose.model("Product", productSchema);

export { SUBCATEGORY_OWNER };
export default Product;