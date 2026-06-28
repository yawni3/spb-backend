const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  shortDescription: {
    type: String,
    default: ""
  },
  price: {
    type: Number,
    default: 0
  },
  isFree: {
    type: Boolean,
    default: false
  },
  bannerUrl: {
    type: String,
    default: ""
  },
  thumbnailUrl: {
    type: String,
    default: ""
  },
  previewImages: [{
    type: String
  }],
  category: {
    type: String,
    default: ""
  },
  tags: [{
    type: String
  }],
  whatsIncluded: [{
    type: String
  }],
  license: {
    personalUse: {
      type: Boolean,
      default: true
    },
    commercialUse: {
      type: Boolean,
      default: true
    },
    resaleAllowed: {
      type: Boolean,
      default: false
    }
  },
  fileUrl: {
    type: String,
    default: ""
  },
  version: {
    type: String,
    default: ""
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    default: function() {
      if (this.name) {
        return this.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      return `product-${Date.now()}`;
    }
  }
});

module.exports = mongoose.model('Product', productSchema);