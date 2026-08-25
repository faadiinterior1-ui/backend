import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Protect middleware:
 * Authenticates requests via HTTP-only cookie or Authorization: Bearer <token> header.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const cookieName = process.env.COOKIE_NAME || 'clock_store_token';

  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies[cookieName]) {
    token = req.cookies[cookieName];
  }
  // 2. Check Authorization Bearer header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError('Not authorized. No authentication token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'celeste_default_secret_key_2026');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new ApiError('The user belonging to this token no longer exists.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Not authorized. Invalid or expired token.', 401);
  }
});

/**
 * Optional Protect middleware:
 * Attaches user to req.user if a valid token is present, but does not block unauthenticated (guest) requests.
 */
export const optionalProtect = asyncHandler(async (req, res, next) => {
  let token;
  const cookieName = process.env.COOKIE_NAME || 'clock_store_token';

  if (req.cookies && req.cookies[cookieName]) {
    token = req.cookies[cookieName];
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'celeste_default_secret_key_2026');
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Ignore invalid or expired token for optional auth routes
    }
  }
  next();
});

/**
 * Admin authorization middleware:
 * Ensures the authenticated user has the 'admin' role.
 */
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  throw new ApiError('Access denied. Administrator privileges required.', 403);
};

// Backwards compatibility alias
export const adminOnly = admin;
