import crypto from 'crypto';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendTokenResponse, clearTokenCookie } from '../utils/generateToken.js';
import { sendEmail, buildResetEmailHTML } from '../utils/sendEmail.js';

// ─── @route   POST /api/auth/register ───────────────────────────────────────
// @desc    Register a new customer account
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  if (!name || !email || !password) {
    throw new ApiError('Please provide name, email, and password.', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError('An account with this email address already exists.', 409);
  }

  // Public registration is ALWAYS standard 'user' role
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'user',
    phone: phone || '',
    address: address || {},
  });

  sendTokenResponse(user, 201, res, 'Registration successful. Welcome to Céleste Artisanal Clocks!');
});

// ─── @route   POST /api/auth/login ──────────────────────────────────────────
// @desc    Authenticate user & issue JWT in HTTP-only cookie
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError('Please provide email and password.', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    throw new ApiError('Invalid email or password.', 401);
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new ApiError('Invalid email or password.', 401);
  }

  sendTokenResponse(user, 200, res, 'Welcome back to Céleste!');
});

// ─── @route   POST /api/auth/logout ─────────────────────────────────────────
// @desc    Log out current user & clear authentication cookie
// @access  Public
export const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// ─── @route   GET /api/auth/me ───────────────────────────────────────────────
// @desc    Get currently logged in user profile
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id || req.user.id);
  if (!user) {
    throw new ApiError('User not found.', 404);
  }

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      address: user.address || {},
      createdAt: user.createdAt,
    },
  });
});

// ─── @route   PUT /api/auth/profile ──────────────────────────────────────────
// @desc    Update user profile & address
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id || req.user.id).select('+password');
  if (!user) {
    throw new ApiError('User not found.', 404);
  }

  if (req.body.name) user.name = req.body.name.trim();
  if (req.body.phone) user.phone = req.body.phone.trim();
  if (req.body.address) {
    user.address = {
      ...user.address,
      ...req.body.address,
    };
  }

  if (req.body.password) {
    if (req.body.password.length < 6) {
      throw new ApiError('Password must be at least 6 characters.', 400);
    }
    user.password = req.body.password;
  }

  const updatedUser = await user.save();
  sendTokenResponse(updatedUser, 200, res, 'Profile updated successfully.');
});

// ─── @route   POST /api/auth/forgot-password ────────────────────────────────
// @desc    Send password reset email link
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError('Please provide your email address.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    // Avoid email enumeration
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been dispatched.',
    });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save({ validateBeforeSave: false });

  const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request — Céleste Horologie',
      html: buildResetEmailHTML(user.name, resetUrl),
    });

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been dispatched.',
    });
  } catch (emailError) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError('Could not send reset email. Please try again later.', 500);
  }
});

// ─── @route   PUT /api/auth/reset-password/:token ───────────────────────────
// @desc    Reset password via token
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    throw new ApiError('Password must be at least 6 characters long.', 400);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError('Password reset link is invalid or has expired.', 400);
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password reset successful! You are now logged in.');
});
