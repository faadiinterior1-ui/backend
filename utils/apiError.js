/**
 * apiError.js
 * Standardized operational error class for REST API exceptions.
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
