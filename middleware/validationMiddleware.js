import mongoose from 'mongoose';
import validator from 'validator';
import { ApiError } from '../utils/apiError.js';

/**
 * Validates whether a route parameter is a valid MongoDB ObjectId
 */
export const validateObjectId = (paramName = 'id') => (req, res, next) => {
  const id = req.params[paramName];
  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(`Invalid ${paramName} identifier format.`, 400);
  }
  next();
};

/**
 * Validates registration payload
 */
export const validateRegisterInput = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || validator.isEmpty(name.trim())) {
    errors.push('Name is required.');
  }

  if (!email || !validator.isEmail(email)) {
    errors.push('Please provide a valid email address.');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  if (errors.length > 0) {
    throw new ApiError('Validation Failed', 400, errors);
  }

  next();
};

/**
 * Validates login payload
 */
export const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !validator.isEmail(email)) {
    errors.push('Please provide a valid email address.');
  }

  if (!password) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    throw new ApiError('Validation Failed', 400, errors);
  }

  next();
};

/**
 * Validates contact form submission
 */
export const validateContactInput = (req, res, next) => {
  const { name, email, subject, message } = req.body;
  const errors = [];

  if (!name || validator.isEmpty(name.trim())) {
    errors.push('Name is required.');
  }

  if (!email || !validator.isEmail(email)) {
    errors.push('Please provide a valid email address.');
  }

  if (!subject || validator.isEmpty(subject.trim())) {
    errors.push('Subject is required.');
  }

  if (!message || validator.isEmpty(message.trim())) {
    errors.push('Message is required.');
  }

  if (errors.length > 0) {
    throw new ApiError('Validation Failed', 400, errors);
  }

  next();
};
