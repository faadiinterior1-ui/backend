import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Item price must be non-negative'],
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    orderItems: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'An order must contain at least one item',
      },
    },
    shippingAddress: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      street: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      city: { type: String, required: [true, 'Shipping city is required'], trim: true },
      state: { type: String, trim: true, default: '' },
      postalCode: { type: String, required: [true, 'Postal code is required'], trim: true },
      country: { type: String, required: [true, 'Country is required'], trim: true, default: 'Pakistan' },
      phone: { type: String, required: [true, 'Contact phone is required'], trim: true },
    },
    paymentMethod: {
      type: String,
      default: 'cash_on_delivery',
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      updateTime: { type: String },
      emailAddress: { type: String },
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: 0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: 0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: 0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate orderId if not provided
orderSchema.pre('save', function (next) {
  if (!this.orderId) {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderId = `ORD-${Date.now().toString().slice(-6)}-${randomHex}`;
  }
  next();
});

// Virtual compatibility aliases
orderSchema.virtual('totalAmount').get(function () {
  return this.totalPrice;
});
orderSchema.virtual('subtotal').get(function () {
  return this.itemsPrice;
});
orderSchema.virtual('items').get(function () {
  return this.orderItems;
});

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
