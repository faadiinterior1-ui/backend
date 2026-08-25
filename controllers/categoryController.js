import { Category } from '../models/Category.js';
import { categoriesData } from '../seed/seedData.js';
import mongoose from 'mongoose';

export const getCategories = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, categories: categoriesData });
    }
    const categories = await Category.find({});
    if (categories.length === 0) {
      return res.json({ success: true, categories: categoriesData });
    }
    res.json({ success: true, categories });
  } catch (error) {
    res.json({ success: true, categories: categoriesData });
  }
};
