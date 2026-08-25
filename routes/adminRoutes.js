import express from 'express';
import {
  getAdminStats,
  getUsersList,
  updateUserRole,
  deleteUserAccount,
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protect & admin middleware to all admin routes
router.use(protect);
router.use(admin);

router.get('/stats', getAdminStats);
router.get('/users', getUsersList);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUserAccount);

export default router;
