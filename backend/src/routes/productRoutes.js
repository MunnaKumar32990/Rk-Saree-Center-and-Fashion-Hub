import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
} from "../controllers/productController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";
import { updateProduct } from "../controllers/productController.js";
import { deleteProduct } from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", protect, admin, createProduct);
router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

export default router;
