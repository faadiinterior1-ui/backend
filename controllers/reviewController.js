import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper to recalculate and update product rating and count
export const updateProductRatings = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    const avg = Math.round(stats[0].avgRating * 10) / 10;
    await Product.findByIdAndUpdate(productId, {
      ratings: avg,
      rating: avg,
      numReviews: stats[0].numReviews,
      reviewCount: stats[0].numReviews,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratings: 5.0,
      rating: 5.0,
      numReviews: 0,
      reviewCount: 0,
    });
  }
};

// ─── @route   POST /api/products/:id/reviews ────────────────────────────────
// @desc    Create a new product review
// @access  Private
export const createProductReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError('Please provide a rating integer between 1 and 5.', 400);
  }

  if (!comment || !comment.trim()) {
    throw new ApiError('Please provide a review comment.', 400);
  }

  // Find product by id or slug
  let product = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    product = await Product.findById(id);
  }
  if (!product) {
    product = await Product.findOne({ slug: id });
  }

  if (!product) {
    throw new ApiError(`Product not found with id: ${id}`, 404);
  }

  // 1. Verify user has purchased this product AND order is marked as delivered
  const hasDeliveredOrder = await Order.findOne({
    user: req.user._id,
    $or: [{ status: 'delivered' }, { isDelivered: true }],
    'orderItems.product': product._id,
  });

  if (!hasDeliveredOrder) {
    throw new ApiError(
      'Reviews can only be submitted after your order for this timepiece has been delivered.',
      403
    );
  }

  // 2. Check if user already reviewed this product
  const alreadyReviewed = await Review.findOne({
    product: product._id,
    user: req.user._id,
  });

  if (alreadyReviewed) {
    throw new ApiError('You have already submitted a review for this handcrafted clock.', 400);
  }

  // Create review
  const review = await Review.create({
    user: req.user._id,
    product: product._id,
    rating: Number(rating),
    comment: comment.trim(),
  });

  // Atomically update product ratings
  await updateProductRatings(product._id);

  // Return review populated with author name
  const populatedReview = await Review.findById(review._id).populate('user', 'name');

  res.status(201).json({
    success: true,
    message: 'Thank you! Your artisanal review has been submitted.',
    review: populatedReview,
  });
});

// ─── @route   GET /api/products/:id/reviews ─────────────────────────────────
// @desc    Get all reviews for a product with pagination
// @access  Public
export const getProductReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Resolve product
  let product = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    product = await Product.findById(id);
  }
  if (!product) {
    product = await Product.findOne({ slug: id });
  }

  if (!product) {
    throw new ApiError(`Product not found with id: ${id}`, 404);
  }

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (currentPage - 1) * pageSize;

  const totalReviews = await Review.countDocuments({ product: product._id });
  const totalPages = Math.ceil(totalReviews / pageSize) || 1;

  const reviews = await Review.find({ product: product._id })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  res.status(200).json({
    success: true,
    count: reviews.length,
    reviews,
    pagination: {
      page: currentPage,
      limit: pageSize,
      totalItems: totalReviews,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  });
});
