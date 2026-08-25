import { ApiError } from '../utils/apiError.js';

/**
 * Catches 404 routes not found
 */
export const notFound = (req, res, next) => {
  next(new ApiError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

/**
 * Centralized error handler for all Express errors
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || err.status || 500;
  let errors = err.errors || [];

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with invalid ID: ${err.value}`;
    error = new ApiError(message, 400);
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate value entered for ${field}. Please use another value.`;
    error = new ApiError(message, 409);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = 'Validation Error. Please check the submitted fields.';
    errors = Object.values(err.errors || {}).map((val) => val.message);
    error = new ApiError(message, 422, errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError('Invalid authentication token.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new ApiError('Authentication token has expired. Please log in again.', 401);
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new ApiError('Uploaded file is too large. Maximum allowed size is 5MB.', 413);
    } else {
      error = new ApiError(`File upload error: ${err.message}`, 400);
    }
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
