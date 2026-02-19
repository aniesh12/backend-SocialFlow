const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['image', 'video', 'gif', 'audio', 'document']
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  preview: {
    type: String,
    default: null
  },
  dimensions: {
    width: { type: Number, default: null },
    height: { type: Number, default: null }
  },
  duration: {
    type: Number,
    default: null
  },
  altText: {
    type: String,
    default: ''
  },
  caption: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  folder: {
    type: String,
    default: 'uncategorized'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedIn: [{
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    platform: String,
    usedAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    exif: mongoose.Schema.Types.Mixed,
    location: {
      latitude: Number,
      longitude: Number
    },
    device: String,
    software: String
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed'
  },
  variants: [{
    type: {
      type: String,
      enum: ['thumbnail', 'small', 'medium', 'large', 'optimized']
    },
    url: String,
    dimensions: {
      width: Number,
      height: Number
    },
    size: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

mediaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

mediaSchema.index({ user: 1, createdAt: -1 });
mediaSchema.index({ type: 1 });
mediaSchema.index({ folder: 1 });
mediaSchema.index({ isUsed: 1 });
mediaSchema.index({ tags: 1 });

module.exports = mongoose.model('Media', mediaSchema);
