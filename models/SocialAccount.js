const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest']
  },
  accountType: {
    type: String,
    enum: ['personal', 'business', 'creator'],
    default: 'personal'
  },
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  coverImage: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
  postsCount: {
    type: Number,
    default: 0
  },
  isConnected: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    default: null
  },
  tokenExpiresAt: {
    type: Date,
    default: null
  },
  platformUserId: {
    type: String,
    required: true
  },
  pageId: {
    type: String,
    default: null
  },
  pageAccessToken: {
    type: String,
    default: null
  },
  permissions: [{
    type: String
  }],
  settings: {
    autoPublish: { type: Boolean, default: false },
    defaultHashtags: [{ type: String }],
    postFormat: {
      type: String,
      enum: ['standard', 'story', 'reel', 'carousel'],
      default: 'standard'
    },
    bestTimeToPost: {
      enabled: { type: Boolean, default: false },
      timeSlots: [{ hour: Number, minute: Number }]
    }
  },
  analytics: {
    totalPosts: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  disconnectedAt: {
    type: Date,
    default: null
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

socialAccountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

socialAccountSchema.index({ user: 1, platform: 1 });
socialAccountSchema.index({ platformUserId: 1, platform: 1 }, { unique: true });
socialAccountSchema.index({ isConnected: 1 });

module.exports = mongoose.model('SocialAccount', socialAccountSchema);
