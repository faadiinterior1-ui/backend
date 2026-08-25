import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token with the given user ID payload.
 */
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'celeste_default_secret_key_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Get cookie options configured for environment security
 */
export const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
};

/**
 * Send token in HTTP-only cookie and return sanitized user JSON response
 */
export const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  const cookieName = process.env.COOKIE_NAME || 'clock_store_token';

  res.cookie(cookieName, token, getCookieOptions());

  const userPayload = {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    address: user.address || {},
  };

  res.status(statusCode).json({
    success: true,
    message,
    token, // Also returned for Authorization: Bearer <token> usage in Postman / API test tools
    user: userPayload,
  });
};

/**
 * Clear the auth cookie on logout
 */
export const clearTokenCookie = (res) => {
  const cookieName = process.env.COOKIE_NAME || 'clock_store_token';
  const options = getCookieOptions();
  delete options.maxAge;
  options.expires = new Date(0);

  res.cookie(cookieName, '', options);
};
