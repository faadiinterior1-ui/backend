import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ─── @route   GET /api/admin/stats ───────────────────────────────────────────
// @desc    Get dashboard metrics & aggregations for admin overview
// @access  Private/Admin
export const getAdminStats = asyncHandler(async (req, res) => {
  // Aggregate KPI stats in parallel for optimal performance
  const [
    totalProducts,
    totalOrders,
    totalUsers,
    pendingOrdersCount,
    lowStockProductsCount,
    recentOrders,
    lowStockProducts,
    revenueAgg,
  ] = await Promise.all([
    Product.countDocuments({ isArchived: { $ne: true } }),
    Order.countDocuments(),
    User.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    Product.countDocuments({ stock: { $lte: 5 }, isArchived: { $ne: true } }),
    Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Product.find({ stock: { $lte: 5 }, isArchived: { $ne: true } })
      .sort({ stock: 1 })
      .limit(6)
      .lean(),
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
    ]),
  ]);

  const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

  res.status(200).json({
    success: true,
    stats: {
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      pendingOrdersCount,
      lowStockProductsCount,
      recentOrders,
      lowStockProducts,
    },
  });
});

// ─── @route   GET /api/admin/users ───────────────────────────────────────────
// @desc    Get paginated user list for user management
// @access  Private/Admin
export const getUsersList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;

  const filter = {};
  if (role) {
    filter.role = role;
  }
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (currentPage - 1) * pageSize;

  const totalUsers = await User.countDocuments(filter);
  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  res.status(200).json({
    success: true,
    count: users.length,
    users,
    pagination: {
      page: currentPage,
      limit: pageSize,
      totalItems: totalUsers,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  });
});

// ─── @route   PUT /api/admin/users/:id/role ──────────────────────────────────
// @desc    Update user role (user/admin)
// @access  Private/Admin
export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['user', 'admin'].includes(role)) {
    throw new ApiError('Invalid role specified. Role must be "user" or "admin".', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(`User not found with ID: ${id}`, 404);
  }

  // Safety check: Prevent demoting the last admin user
  if (user.role === 'admin' && role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new ApiError('Cannot demote the last remaining administrator.', 400);
    }
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User role successfully updated to "${role}".`,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// ─── @route   DELETE /api/admin/users/:id ────────────────────────────────────
// @desc    Delete user account (Admin Only)
// @access  Private/Admin
export const deleteUserAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user._id.toString()) {
    throw new ApiError('You cannot delete your own logged-in admin account.', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(`User not found with ID: ${id}`, 404);
  }

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new ApiError('Cannot delete the last remaining administrator account.', 400);
    }
  }

  await User.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'User account deleted successfully.',
  });
});
