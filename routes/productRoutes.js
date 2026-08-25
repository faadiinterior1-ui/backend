import express from 'express';
import {
  getProducts,
  getFeaturedProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import {
  createProductReview,
  getProductReviews,
} from '../controllers/reviewController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:id', getProductByIdOrSlug);

// Reviews nested routes
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', protect, createProductReview);

// Admin-only CRUD routes
router.post('/', protect, admin, upload.array('images', 5), createProduct);
router.put('/:id', protect, admin, upload.array('images', 5), updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

export default router;
