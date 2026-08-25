import { ContactMessage } from '../models/ContactMessage.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ─── @route   POST /api/contact ─────────────────────────────────────────────
// @desc    Submit a contact inquiry message
// @access  Public (Rate limited)
export const submitContactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    throw new ApiError('Please provide all required fields: name, email, subject, and message.', 400);
  }

  const contactMessage = await ContactMessage.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    subject: subject.trim(),
    message: message.trim(),
    status: 'new',
  });

  res.status(201).json({
    success: true,
    message: 'Your message has been received. Our concierge will be in touch shortly.',
    data: {
      id: contactMessage._id,
      name: contactMessage.name,
      createdAt: contactMessage.createdAt,
    },
  });
});

// Backwards compatibility alias
export const sendContact = submitContactMessage;

// ─── @route   GET /api/contact ──────────────────────────────────────────────
// @desc    Get all contact inquiries (Admin only)
// @access  Private/Admin
export const getContactMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (currentPage - 1) * pageSize;

  const totalMessages = await ContactMessage.countDocuments(filter);
  const totalPages = Math.ceil(totalMessages / pageSize) || 1;

  const messages = await ContactMessage.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  res.status(200).json({
    success: true,
    count: messages.length,
    messages,
    pagination: {
      page: currentPage,
      limit: pageSize,
      totalItems: totalMessages,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  });
});

// ─── @route   PUT /api/contact/:id/status ───────────────────────────────────
// @desc    Update contact message status (Admin only)
// @access  Private/Admin
export const updateContactStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['new', 'read', 'resolved'].includes(status)) {
    throw new ApiError('Status must be one of: new, read, resolved', 400);
  }

  const message = await ContactMessage.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!message) {
    throw new ApiError(`Contact message not found with id: ${id}`, 404);
  }

  res.status(200).json({
    success: true,
    message: `Message status updated to ${status}`,
    contactMessage: message,
  });
});
