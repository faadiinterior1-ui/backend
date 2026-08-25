import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a registered user'],
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Review must be associated with a product'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating between 1 and 5'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer rating',
      },
    },
    comment: {
      type: String,
      required: [true, 'Please write your review comment'],
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
    },
  },
  { timestamps: true }
);

// Prevent user from submitting multiple reviews for the same product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export default Review;
