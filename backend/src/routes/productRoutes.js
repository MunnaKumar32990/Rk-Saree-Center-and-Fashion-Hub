import express from "express";
import { sharedLimiter } from "../utils/rateLimitStore.js";
import {
  getProducts,
  getTopProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  manageReview,
  notifyMeWhenBackInStock,
  getRestockSubscribers,
  getProductFacets,
  getLowStockProducts,
} from "../controllers/productController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * The "notify me when it's back" form is public and unauthenticated, so it gets
 * its own limit — otherwise anyone could use it to mail-bomb an address.
 */
const restockLimiter = sharedLimiter("restock", {
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "You've requested enough alerts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Review spam guard. */
const reviewLimiter = sharedLimiter("review", {
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: "Too many reviews submitted. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * The filter-facet endpoint runs five aggregations over the whole collection.
 * The global limiter deliberately exempts it (so a shopper filtering never hits
 * a throttle), which means this route has to carry its own ceiling — otherwise
 * it is the cheapest possible way to burn 100% of a MongoDB node's CPU.
 */
const facetsLimiter = sharedLimiter("facets", {
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many filter requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.route("/")
  .get(getProducts)
  .post(protect, admin, createProduct);

router.get("/top", getTopProducts);
router.get("/facets", facetsLimiter, getProductFacets);
router.get("/admin/low-stock", protect, admin, getLowStockProducts);

// The sitemap is served once from the app root (see server.js), not duplicated
// here — two mounted copies meant crawlers could trigger a full catalogue scan
// on either route.
router.route("/:id")
  .get(getProductById)
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

router.post("/:id/reviews", protect, reviewLimiter, createProductReview);
router.put("/:id/reviews/:reviewId/:action", protect, manageReview);

router.post("/:id/notify-me", restockLimiter, notifyMeWhenBackInStock);
router.get("/:id/restock-subscribers", protect, admin, getRestockSubscribers);

export default router;