import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get all products with search, filter, pagination
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const { keyword, category, subcategory, color, minPrice, maxPrice, rating, size, sort, featured } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const query = {};

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
      { tags: { $regex: keyword, $options: "i" } },
    ];
  }

  if (category && category !== "All") {
    query.category = category;
  }

  if (subcategory) {
    query.subcategory = subcategory;
  }

  if (color) {
    query.colors = { $in: [color] };
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (rating) {
    query.rating = { $gte: Number(rating) };
  }

  if (size) {
    query.sizes = { $in: [size] };
  }

  if (featured === "true") {
    query.isFeatured = true;
  }

  // Sort options
  let sortOption = {};
  switch (sort) {
    case "price_asc":
      sortOption = { price: 1 };
      break;
    case "price_desc":
      sortOption = { price: -1 };
      break;
    case "rating":
      sortOption = { rating: -1 };
      break;
    case "newest":
      sortOption = { createdAt: -1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(limit);

  res.json({
    products,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
});

// @desc    Get top products (featured / high rated)
// @route   GET /api/products/top
// @access  Public
export const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ rating: { $gte: 4 } })
    .sort({ rating: -1 })
    .limit(8);
  res.json(products);
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
});

// @desc    Create product (Admin)
// @route   POST /api/products
// @access  Admin
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name, image, images, brand, category, subcategory,
    description, price, discount, countInStock, sizes, colors, isFeatured, tags,
  } = req.body;

  const product = await Product.create({
    name,
    image,
    images: images || [],
    brand,
    category,
    subcategory,
    description,
    price,
    discount: discount || 0,
    countInStock: countInStock || 0,
    sizes: sizes || [],
    colors: colors || [],
    isFeatured: isFeatured || false,
    tags: tags || [],
  });

  res.status(201).json(product);
});

// @desc    Update product (Admin)
// @route   PUT /api/products/:id
// @access  Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const fields = [
    "name", "image", "images", "brand", "category", "subcategory",
    "description", "price", "discount", "countInStock", "sizes", "colors", "isFeatured", "tags",
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  const updatedProduct = await product.save();
  res.json(updatedProduct);
});

// @desc    Delete product (Admin)
// @route   DELETE /api/products/:id
// @access  Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await product.deleteOne();
  res.json({ message: "Product removed successfully" });
});

// @desc    Create product review
// @route   POST /api/products/:id/reviews
// @access  Private
export const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    res.status(400);
    throw new Error("Product already reviewed");
  }

  const review = {
    name: req.user.name,
    rating: Number(rating),
    comment,
    user: req.user._id,
  };

  product.reviews.push(review);
  product.numReviews = product.reviews.length;
  product.rating =
    product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;

  await product.save();
  res.status(201).json({ message: "Review added" });
});

// @desc    Get sitemap XML
// @route   GET /sitemap.xml
// @access  Public
export const getSitemap = asyncHandler(async (req, res) => {
  const products = await Product.find({}).select("_id category updatedAt");
  const frontendUrl = process.env.FRONTEND_URL || "https://rksareefashionhub.com";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${frontendUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${frontendUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${frontendUrl}/register</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${frontendUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${frontendUrl}/shipping</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${frontendUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${frontendUrl}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`;

  // Categories
  const categories = ["Men", "Women", "Kids"];
  categories.forEach((cat) => {
    xml += `
  <url>
    <loc>${frontendUrl}/category/${cat}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  // Products
  products.forEach((p) => {
    const lastmod = p.updatedAt ? p.updatedAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
    xml += `
  <url>
    <loc>${frontendUrl}/product/${p._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  xml += `
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.status(200).send(xml);
});

