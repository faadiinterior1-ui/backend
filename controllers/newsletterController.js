import { Newsletter } from '../models/Newsletter.js';
import mongoose from 'mongoose';

export const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (mongoose.connection.readyState === 1) {
      await Newsletter.findOneAndUpdate({ email }, { email, isActive: true }, { upsert: true, new: true });
    }

    res.status(200).json({
      success: true,
      message: 'Welcome to Céleste Private Circle! Check your inbox for your 10% private welcoming gift.',
      couponCode: 'HANDMADE10',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
