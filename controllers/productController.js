import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper to generate a URL-safe slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// ─── @route   GET /api/products ─────────────────────────────────────────────
// @desc    Get all products with filtering, search, sorting & pagination
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 12,
    featured,
    isFeatured,
    isLimitedEdition,
  } = req.query;

  // Build query filter
  const filter = { isArchived: { $ne: true } };

  // Category filter (supports exact name, hyphenated, and case-insensitive matching)
  if (category && category.toLowerCase() !== 'all') {
    const normalizedCat = category.replace(/-/g, ' ');
    filter.category = { $regex: new RegExp(`^${normalizedCat}$`, 'i') };
  }

  // Price range filtering
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
      filter.price.$lte = Number(maxPrice);
    }
  }

  // Featured and limited edition filters
  if (featured === 'true' || isFeatured === 'true') {
    filter.isFeatured = true;
  }
  if (isLimitedEdition === 'true') {
    filter.isLimitedEdition = true;
  }

  // Full-text / regex search
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { shortDescription: searchRegex },
      { description: searchRegex },
      { category: searchRegex },
      { material: searchRegex },
    ];
  }

  // Sorting
  let sortOption = { createdAt: -1 }; // default: newest
  switch (sort) {
    case 'oldest':
      sortOption = { createdAt: 1 };
      break;
    case 'price_asc':
    case 'price-asc':
      sortOption = { price: 1 };
      break;
    case 'price_desc':
    case 'price-desc':
      sortOption = { price: -1 };
      break;
    case 'rating':
      sortOption = { ratings: -1, numReviews: -1 };
      break;
    case 'popular':
      sortOption = { numReviews: -1, ratings: -1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }

  // Pagination parameters with safety bounds
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (currentPage - 1) * pageSize;

  const totalItems = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const products = await Product.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(pageSize)
    .lean();

  res.status(200).json({
    success: true,
    count: products.length,
    products,
    pagination: {
      page: currentPage,
      limit: pageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  });
});

// ─── @route   GET /api/products/featured ────────────────────────────────────
// @desc    Get featured luxury wall clocks for homepage carousel/showcase
// @access  Public
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = Math.min(20, parseInt(req.query.limit, 10) || 6);
  const products = await Product.find({ isFeatured: true, isArchived: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});

// ─── @route   GET /api/products/:id ─────────────────────────────────────────
// @desc    Get single product by MongoDB ObjectId OR slug
// @access  Public
export const getProductByIdOrSlug = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let product = null;

  if (mongoose.Types.ObjectId.isValid(id)) {
    product = await Product.findById(id);
  }

  if (!product) {
    product = await Product.findOne({ slug: id.toLowerCase().trim() });
  }

  if (!product || product.isArchived) {
    throw new ApiError(`Handcrafted clock with identifier '${id}' not found.`, 404);
  }

  res.status(200).json({
    success: true,
    product,
  });
});

// ─── @route   POST /api/products ────────────────────────────────────────────
// @desc    Create a new product (Admin Only, supports Multer uploads)
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    shortDescription,
    price,
    discountPrice,
    category,
    materials,
    material,
    dimensions,
    stock,
    isFeatured,
    isLimitedEdition,
    colors,
    color,
    movementType,
    warrantyYears,
    badges,
  } = req.body;

  if (!name || !description || !price || !category) {
    throw new ApiError('Please provide name, description, price, and category.', 400);
  }

  // Handle uploaded images from Multer
  let images = [];
  if (req.files && req.files.length > 0) {
    images = req.files.map((file) => `/uploads/${file.filename}`);
  } else if (req.body.images) {
    images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
  } else if (req.body.image) {
    images = [req.body.image];
  }

  if (images.length === 0) {
    images = ['/img1.jpg']; // Default fallback luxury timepiece image
  }

  // Generate unique slug
  let slug = req.body.slug ? slugify(req.body.slug) : slugify(name);
  const slugExists = await Product.findOne({ slug });
  if (slugExists) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const product = await Product.create({
    name: name.trim(),
    slug,
    description: description.trim(),
    shortDescription: (shortDescription || description.substring(0, 150)).trim(),
    price: Number(price),
    discountPrice: discountPrice ? Number(discountPrice) : 0,
    category: category.trim(),
    images,
    material: material || (Array.isArray(materials) ? materials.join(', ') : materials) || 'Solid Wood & Epoxy Resin',
    materials: materials ? (Array.isArray(materials) ? materials : [materials]) : [],
    dimensions: dimensions || '45 cm (17.7") Diameter x 4 cm Depth',
    stock: stock !== undefined ? Number(stock) : 10,
    isFeatured: isFeatured === 'true' || isFeatured === true,
    isLimitedEdition: isLimitedEdition === 'true' || isLimitedEdition === true,
    colors: colors ? (Array.isArray(colors) ? colors : [colors]) : [],
    color: color || '',
    movementType: movementType || 'Silent Sweep Quartz (Non-Ticking)',
    warrantyYears: warrantyYears ? Number(warrantyYears) : 2,
    badges: badges ? (Array.isArray(badges) ? badges : [badges]) : ['Handmade'],
    createdBy: req.user?._id,
  });

  res.status(201).json({
    success: true,
    message: 'Luxury wall clock product created successfully.',
    product,
  });
});

// ─── @route   PUT /api/products/:id ─────────────────────────────────────────
// @desc    Update an existing product (Admin Only)
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let product = await Product.findById(id);
  if (!product) {
    product = await Product.findOne({ slug: id });
  }

  if (!product) {
    throw new ApiError(`Product not found with id: ${id}`, 404);
  }

  // Handle uploaded images from Multer
  if (req.files && req.files.length > 0) {
    const uploadedImages = req.files.map((file) => `/uploads/${file.filename}`);
    req.body.images = [...(req.body.preserveImages ? product.images : []), ...uploadedImages];
  }

  if (req.body.name && !req.body.slug) {
    req.body.slug = slugify(req.body.name);
  }

  const updatedProduct = await Product.findByIdAndUpdate(product._id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Product updated successfully.',
    product: updatedProduct,
  });
});

// ─── @route   DELETE /api/products/:id ──────────────────────────────────────
// @desc    Delete or archive a product (Admin Only)
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(`Product not found with id: ${id}`, 404);
  }

  await Product.findByIdAndDelete(product._id);

  res.status(200).json({
    success: true,
    message: 'Product successfully deleted from collection.',
  });
});
