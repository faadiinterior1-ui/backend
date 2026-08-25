import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Please provide a product slug'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide product description'],
      trim: true,
    },
    shortDescription: {
      type: String,
      required: [true, 'Please provide short description'],
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide product price'],
      min: [0, 'Price must be a positive number'],
      index: true,
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: [0, 'Discount price must be non-negative'],
      validate: {
        validator: function (val) {
          // If discountPrice is provided, it must be <= regular price
          return !val || val <= this.price;
        },
        message: 'Discount price ({VALUE}) must be less than or equal to regular price',
      },
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price must be non-negative'],
    },
    category: {
      type: String,
      required: [true, 'Please specify a category'],
      trim: true,
      index: true,
    },
    images: {
      type: [String],
      required: [true, 'Please provide at least one product image'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'A product must have at least one image',
      },
    },
    colors: {
      type: [String],
      default: [],
    },
    color: {
      type: String,
      trim: true,
      default: '',
    },
    material: {
      type: String,
      trim: true,
      default: '',
    },
    materials: {
      type: [String],
      default: [],
    },
    dimensions: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Please specify dimensions'],
      default: '45 cm (17.7") Diameter x 4 cm Depth',
    },
    stock: {
      type: Number,
      required: [true, 'Please specify available stock'],
      min: [0, 'Stock cannot be negative'],
      default: 10,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isLimitedEdition: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    ratings: {
      type: Number,
      default: 4.9,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
    },
    rating: {
      type: Number,
      default: 4.9,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
    },
    numReviews: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },
    badges: {
      type: [String],
      default: ['Handmade'],
    },
    movementType: {
      type: String,
      default: 'Silent Sweep Quartz (Non-Ticking)',
    },
    warrantyYears: {
      type: Number,
      default: 2,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual computed field: finalPrice
productSchema.virtual('finalPrice').get(function () {
  if (this.discountPrice && this.discountPrice > 0 && this.discountPrice < this.price) {
    return this.discountPrice;
  }
  return this.price;
});

// Indexes for fast searching and filtering
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isFeatured: 1, createdAt: -1 });
productSchema.index(
  { name: 'text', description: 'text', shortDescription: 'text', category: 'text' },
  { weights: { name: 5, category: 3, shortDescription: 2, description: 1 } }
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
