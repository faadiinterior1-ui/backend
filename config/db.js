import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/celeste_clocks';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Successfully connected to Host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Error] Connection failed: ${error.message}`);
    // We log error and let callers handle or continue
    return null;
  }
};
