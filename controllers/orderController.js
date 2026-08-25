import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendOrderConfirmationEmails, sendOrderDeliveredEmail } from '../utils/sendEmail.js';

// ─── @route   POST /api/orders ──────────────────────────────────────────────
// @desc    Create new order with server-side price validation & stock decrement
// @access  Private / Authenticated
export const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    items,
    shippingAddress,
    paymentMethod,
    customerInfo,
  } = req.body;

  const rawItems = orderItems || items;

  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ApiError('No order items provided.', 400);
  }

  // Validate shipping address
  const address = {
    name: shippingAddress?.name || (customerInfo ? `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() : (req.body.firstName ? `${req.body.firstName} ${req.body.lastName || ''}`.trim() : req.user?.name || 'Valued Guest')),
    email: shippingAddress?.email || customerInfo?.email || req.body.email || req.user?.email || '',
    street: shippingAddress?.address || shippingAddress?.street || req.body.address || '',
    address: shippingAddress?.address || shippingAddress?.street || req.body.address || '',
    city: shippingAddress?.city || req.body.city || 'Karachi',
    state: shippingAddress?.state || req.body.state || '',
    postalCode: shippingAddress?.postalCode || req.body.postalCode || '75500',
    country: shippingAddress?.country || req.body.country || 'Pakistan',
    phone: shippingAddress?.phone || customerInfo?.phone || req.body.phone || req.user?.phone || '03001234567',
  };

  // Verify each product, confirm stock, and calculate accurate server prices
  let itemsPrice = 0;
  const verifiedOrderItems = [];

  for (const item of rawItems) {
    let productId = item.product || item._id || item.id;
    if (productId && typeof productId === 'object') {
      productId = productId._id || productId.id || productId.toString();
    }

    if (!productId) {
      throw new ApiError('Invalid product ID in order items.', 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(`Product not found with ID: ${productId}`, 404);
    }

    const quantity = parseInt(item.quantity, 10) || 1;
    if (quantity <= 0) {
      throw new ApiError(`Invalid quantity for product: ${product.name}`, 400);
    }

    if (product.stock < quantity) {
      throw new ApiError(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${quantity}.`,
        400
      );
    }

    // Determine accurate server price (honoring active discount price if valid)
    const itemUnitPrice =
      product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;

    itemsPrice += itemUnitPrice * quantity;

    verifiedOrderItems.push({
      product: product._id,
      name: product.name,
      image: (product.images && product.images[0]) || '/img1.jpg',
      quantity,
      price: itemUnitPrice,
    });
  }

  // Calculate shipping & taxes server-side
  // const shippingPrice = itemsPrice >= 20000 ? 0 : 500; // Free shipping over Rs 20,000 (commented out for now)
  const shippingPrice = 0; // Delivery charges set to 0
  const taxPrice = Math.round(itemsPrice * 0.05); // 5% artisanal VAT/tax
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  // Atomically decrement stock
  for (const item of verifiedOrderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  // Create Order
  const order = await Order.create({
    user: req.user?._id || req.user?.id,
    orderItems: verifiedOrderItems,
    shippingAddress: address,
    paymentMethod: paymentMethod || 'cash_on_delivery',
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    status: 'pending',
    isPaid: false,
    isDelivered: false,
  });

  // Asynchronously trigger instant order confirmation emails (Customer + Admin)
  sendOrderConfirmationEmails(order).catch((err) =>
    console.error('Order confirmation email notification error:', err)
  );

  res.status(201).json({
    success: true,
    message: 'Artisanal clock order successfully placed!',
    order,
  });
});

// ─── @route   GET /api/orders/myorders ──────────────────────────────────────
// @desc    Get logged in user's orders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filter = { user: req.user._id };
  if (status) {
    filter.status = status;
  }

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (currentPage - 1) * pageSize;

  const totalOrders = await Order.countDocuments(filter);
  const totalPages = Math.ceil(totalOrders / pageSize) || 1;

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
    pagination: {
      page: currentPage,
      limit: pageSize,
      totalItems: totalOrders,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  });
});

// ─── @route   GET /api/orders/:id ───────────────────────────────────────────
// @desc    Get order by ID (owner or admin only)
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let order = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    order = await Order.findById(id).populate('user', 'name email phone');
  }
  if (!order) {
    order = await Order.findOne({ orderId: id }).populate('user', 'name email phone');
  }

  if (!order) {
    throw new ApiError(`Order not found with identifier: ${id}`, 404);
  }

  // Authorization check: must be owner or admin
  const isOwner = order.user && order.user._id
    ? order.user._id.toString() === req.user._id.toString()
    : order.user && order.user.toString() === req.user._id.toString();

  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ApiError('Not authorized to view this order.', 403);
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// ─── @route   PUT /api/orders/:id/pay ───────────────────────────────────────
// @desc    Mark order as paid (Payment placeholder simulation flow)
// @access  Private
export const updateOrderToPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let order = await Order.findById(id);
  if (!order) {
    order = await Order.findOne({ orderId: id });
  }

  if (!order) {
    throw new ApiError(`Order not found with id: ${id}`, 404);
  }

  // Check ownership
  const isOwner = order.user && order.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ApiError('Not authorized to update payment for this order.', 403);
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.status = 'processing';
  order.paymentResult = {
    id: req.body.id || `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    status: req.body.status || 'COMPLETED',
    updateTime: new Date().toISOString(),
    emailAddress: req.body.emailAddress || req.user.email,
  };

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    message: 'Payment simulated successfully. Order is now processing.',
    order: updatedOrder,
  });
});

// ─── @route   GET /api/orders ───────────────────────────────────────────────
// @desc    Get all orders (Admin only)
// @access  Private/Admin
export const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, sort } = req.query;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (currentPage - 1) * pageSize;

  const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const totalOrders = await Order.countDocuments(filter);
  const totalPages = Math.ceil(totalOrders / pageSize) || 1;

  const orders = await Order.find(filter)
    .populate('user', 'name email phone')
    .sort(sortOption)
    .skip(skip)
    .limit(pageSize)
    .lean();

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
    pagination: {
      page: currentPage,
      limit: pageSize,
      totalItems: totalOrders,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  });
});

// ─── @route   PUT /api/orders/:id/status ────────────────────────────────────
// @desc    Update order status & delivery trigger (Admin only)
// @access  Private/Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    throw new ApiError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  let order = await Order.findById(id);
  if (!order) {
    order = await Order.findOne({ orderId: id });
  }

  if (!order) {
    throw new ApiError(`Order not found with id: ${id}`, 404);
  }

  const previousStatus = order.status;
  order.status = status;

  // Auto trigger delivery timestamps
  if (status === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }

  // If order was cancelled, restore inventory
  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }
  }

  const updatedOrder = await order.save();

  // Asynchronously trigger delivery confirmation email when order is marked as delivered
  if (status === 'delivered' && previousStatus !== 'delivered') {
    sendOrderDeliveredEmail(updatedOrder).catch((err) =>
      console.error('Order delivered email notification error:', err)
    );
  }

  res.status(200).json({
    success: true,
    message: `Order status updated to ${status}`,
    order: updatedOrder,
  });
});

// ─── @route   GET /api/orders/track/:query ──────────────────────────────────
// @desc    Public order tracking by orderId (e.g. ORD-XXX-YYY) or database _id
// @access  Public
export const trackOrder = asyncHandler(async (req, res) => {
  const { query } = req.params;
  if (!query) {
    throw new ApiError('Please provide an Order ID to track.', 400);
  }

  // Try matching by custom orderId string first, then by MongoDB _id
  let order = await Order.findOne({ orderId: query })
    .select('orderId status shippingAddress orderItems totalPrice paymentMethod createdAt updatedAt isDelivered')
    .lean();

  if (!order && mongoose.Types.ObjectId.isValid(query)) {
    order = await Order.findById(query)
      .select('orderId status shippingAddress orderItems totalPrice paymentMethod createdAt updatedAt isDelivered')
      .lean();
  }

  if (!order) {
    throw new ApiError('No order found with this ID. Please check and try again.', 404);
  }

  // Return a sanitized response — no user personal data
  res.status(200).json({
    success: true,
    order: {
      orderId: order.orderId || order._id,
      status: order.status,
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      isDelivered: order.isDelivered,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      shippingAddress: {
        name: order.shippingAddress?.name,
        city: order.shippingAddress?.city,
        country: order.shippingAddress?.country,
      },
      orderItems: order.orderItems?.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
      })),
    },
  });
});
