import express from 'express';
import {
  submitContactMessage,
  getContactMessages,
  updateContactStatus,
} from '../controllers/contactController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateContactInput } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public submission route
router.post('/', validateContactInput, submitContactMessage);

// Admin-only contact inbox management
router.get('/', protect, admin, getContactMessages);
router.put('/:id/status', protect, admin, updateContactStatus);

export default router;
