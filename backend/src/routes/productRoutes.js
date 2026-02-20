import express from "express";
import {
  getProducts,
  getTopProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
} from "../controllers/productController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/")
  .get(getProducts)
  .post(protect, admin, createProduct);

router.get("/top", getTopProducts);

router.route("/:id")
  .get(getProductById)
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

router.post("/:id/reviews", protect, createProductReview);

export default router;
