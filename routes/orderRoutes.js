import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  getAllOrders,
  updateOrderStatus,
  trackOrder,
} from '../controllers/orderController.js';
import { protect, optionalProtect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public order tracking — must come before /:id to avoid conflict
router.get('/track/:query', trackOrder);

// Customer / Guest order routes
router.post('/', optionalProtect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/pay', protect, updateOrderToPaid);

// Admin-only order routes
router.get('/', protect, admin, getAllOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);

export default router;
