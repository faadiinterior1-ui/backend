import express from 'express';
import {
  createProductReview,
  getProductReviews,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(getProductReviews)
  .post(protect, createProductReview);

export default router;
