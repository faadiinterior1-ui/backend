import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ApiError } from '../utils/apiError.js';

// Ensure uploads directory exists locally
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disk storage configuration (Local storage for development, easily swappable for S3/Cloudinary in production)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `clock-${uniqueSuffix}${ext}`);
  },
});

// File filter to allow only image mime-types
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|gif/;
  const extValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedExtensions.test(file.mimetype);

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new ApiError('Invalid file format. Only JPEG, JPG, PNG, WEBP, and GIF images are allowed.', 400), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB file size limit
  },
});
