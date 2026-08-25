import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { Order } from '../models/Order.js';
import { productsData } from './data.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('[Seeder] Connecting to MongoDB Atlas...');
    const connected = await connectDB();
    if (!connected) {
      console.error('[Seeder Error] Database connection failed. Aborting seed.');
      process.exit(1);
    }

    console.log('[Seeder] Clearing existing data collections...');
    await Product.deleteMany({});
    await Review.deleteMany({});
    // We remove the seed admin to re-seed cleanly
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
    await User.deleteMany({ email: adminEmail });

    console.log('[Seeder] Creating Default Store Administrator...');
    const adminUser = await User.create({
      name: process.env.SEED_ADMIN_NAME || 'Store Admin',
      email: adminEmail,
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123456',
      role: 'admin',
      phone: '+92 300 1234567',
      address: {
        street: 'Horology Studio 4B',
        city: 'Karachi',
        state: 'Sindh',
        postalCode: '75500',
        country: 'Pakistan',
      },
    });
    console.log(`[Seeder] Admin user created: ${adminUser.email} (Role: ${adminUser.role})`);

    console.log('[Seeder] Seeding 10 Handcrafted Luxury Wall Clocks...');
    const productsToInsert = productsData.map((prod) => ({
      ...prod,
      createdBy: adminUser._id,
    }));

    const createdProducts = await Product.insertMany(productsToInsert);
    console.log(`[Seeder] Successfully seeded ${createdProducts.length} luxury wall clocks into MongoDB Atlas!`);

    console.log('───────────────────────────────────────────────────');
    console.log('  Database Seeding Completed Successfully!       ');
    console.log(`  Admin Email   : ${adminUser.email}              `);
    console.log('  Admin Password: (configured in .env)           ');
    console.log('───────────────────────────────────────────────────');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder Failure] ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedDatabase();
