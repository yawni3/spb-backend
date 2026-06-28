const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  customer: {
    email: { 
      type: String, 
      required: true,
      trim: true,
      lowercase: true
    }
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number,
    thumbnailUrl: String,
    fileUrl: String
  }],
  total: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['free'],
    default: 'free'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  termsAccepted: {
    type: Boolean,
    required: true,
    default: false
  },
  kvkkAccepted: {
    type: Boolean,
    required: true,
    default: false
  },
  mailSent: {
    type: Boolean,
    default: false
  },
  mailSentAt: {
    type: Date
  },
  mailError: {
    type: String,
    default: ''
  },
  downloadToken: {
    type: String,
    unique: true,
    sparse: true
  },
  downloadExpiresAt: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);