import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    itemCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
