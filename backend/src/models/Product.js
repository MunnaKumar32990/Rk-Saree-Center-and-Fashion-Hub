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
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
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
      enum: ["Men", "Women", "Kids", "Sarees", "Suits", "Kurtis", "Lehengas"],
    },
    subcategory: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      required: [true, "Description is required"],
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
    sizes: {
      type: [String],
      default: [],
    },
    reviews: [reviewSchema],
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [String],
  },
  { timestamps: true }
);

// Virtual for discounted price
productSchema.virtual("discountedPrice").get(function () {
  if (this.discount > 0) {
    return +(this.price * (1 - this.discount / 100)).toFixed(2);
  }
  return this.price;
});

productSchema.set("toJSON", { virtuals: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
