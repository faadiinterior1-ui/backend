import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  validateRegisterInput,
  validateLoginInput,
} from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public auth routes
router.post('/register', validateRegisterInput, register);
router.post('/login', validateLoginInput, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Protected auth routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
