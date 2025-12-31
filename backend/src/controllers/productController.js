import Product from "../models/Product.js";

// @desc Get all products
// @route GET /api/products
export const getProducts = async (req, res) => {
  const products = await Product.find({});
  res.json(products);
};

// @desc Get single product
// @route GET /api/products/:id
export const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: "Product not found" });
  }
};

// @desc Create product (Admin)
// @route POST /api/products
export const createProduct = async (req, res) => {
  const product = new Product(req.body);
  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
};

// @desc Delete product
// @route DELETE /api/products/:id
// @access Admin
export const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } else {
    res.status(404).json({ message: "Product not found" });
  }
};

// @desc Update product
// @route PUT /api/products/:id
// @access Admin
export const updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    product.name = req.body.name || product.name;
    product.image = req.body.image || product.image;
    product.category = req.body.category || product.category;
    product.description = req.body.description || product.description;
    product.price = req.body.price || product.price;
    product.countInStock =
      req.body.countInStock || product.countInStock;
    product.sizes = req.body.sizes || product.sizes;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404).json({ message: "Product not found" });
  }
};


