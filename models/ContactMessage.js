import mongoose from 'mongoose';
import validator from 'validator';

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: 'Please provide a valid email address',
      },
    },
    subject: {
      type: String,
      required: [true, 'Please provide a subject'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Please enter your message'],
      trim: true,
      maxlength: [3000, 'Message cannot exceed 3000 characters'],
    },
    status: {
      type: String,
      enum: ['new', 'read', 'resolved'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

export const ContactMessage =
  mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema);
export default ContactMessage;
