import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ── 1. Baseline Security Headers ──────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows client to fetch uploaded static assets
  })
);

// ── 2. MongoDB Query Sanitization (NoSQL Injection Defense) ───
app.use(mongoSanitize());

// ── 3. CORS Configuration ─────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, lock to specific in production
    },
    credentials: true,
  })
);

// ── 4. Body Parsers & Cookie Parser ───────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── 5. Static Files (Uploads directory for local dev) ─────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── 6. Rate Limiting ──────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 contact inquiries per window
  message: {
    success: false,
    message: 'Too many contact submissions from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── 7. Database Connection ────────────────────────────────────
connectDB();

// ── 8. Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running smoothly',
    brand: 'Céleste Horologie — Artisanal Luxury Wall Clocks',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── 9. Mount Application Routes ───────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin', adminRoutes);

// ── 10. 404 & Centralized Error Handlers ──────────────────────
app.use(notFound);
app.use(errorHandler);

// ── 11. Server Listen ─────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Céleste Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  });
}

export default app;
