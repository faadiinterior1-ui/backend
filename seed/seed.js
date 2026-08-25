import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { categoriesData, productsData } from './seedData.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      console.error('Database connection failed. Seed aborted.');
      process.exit(1);
    }

    console.log('[Seed] Clearing existing collections...');
    await Product.deleteMany({});
    await Category.deleteMany({});

    console.log('[Seed] Inserting Categories...');
    await Category.insertMany(categoriesData);

    console.log('[Seed] Inserting Products...');
    await Product.insertMany(productsData);

    console.log('[Seed] Database successfully seeded with 12 handcrafted wall clock products!');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
