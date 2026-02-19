const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'gif', 'carousel'],
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
  filename: String,
  size: Number,
  mimeType: String,
  dimensions: {
    width: Number,
    height: Number
  },
  duration: {
    type: Number,
    default: null
  },
  altText: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  }
});

const platformPostSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest']
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialAccount',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'],
    default: 'pending'
  },
  platformPostId: {
    type: String,
    default: null
  },
  postUrl: {
    type: String,
    default: null
  },
  postedAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  },
  engagement: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 }
  }
});

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  media: [mediaSchema],
  platforms: [platformPostSchema],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'],
    default: 'draft'
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  postType: {
    type: String,
    enum: ['post', 'story', 'reel', 'video', 'carousel', 'poll'],
    default: 'post'
  },
  tags: [{
    type: String,
    trim: true
  }],
  mentions: [{
    platform: String,
    username: String,
    userId: String
  }],
  location: {
    name: String,
    latitude: Number,
    longitude: Number,
    placeId: String
  },
  linkPreview: {
    url: String,
    title: String,
    description: String,
    image: String
  },
  settings: {
    allowComments: { type: Boolean, default: true },
    allowSharing: { type: Boolean, default: true },
    targetAudience: {
      type: String,
      enum: ['public', 'followers', 'custom'],
      default: 'public'
    },
    sponsorTagged: { type: Boolean, default: false },
    sponsorInfo: {
      name: String,
      brandId: String
    }
  },
  analytics: {
    totalEngagement: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 }
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
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
  },
  publishedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});

postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.platforms && this.platforms.length > 0) {
    const platformStatuses = this.platforms.map(p => p.status);
    
    if (platformStatuses.every(s => s === 'published')) {
      this.status = 'published';
      if (!this.publishedAt) this.publishedAt = Date.now();
    } else if (platformStatuses.some(s => s === 'publishing')) {
      this.status = 'publishing';
    } else if (platformStatuses.some(s => s === 'failed')) {
      this.status = 'failed';
    } else if (platformStatuses.every(s => s === 'scheduled')) {
      this.status = 'scheduled';
    }
  }
  
  next();
});

postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ status: 1 });
postSchema.index({ scheduledAt: 1 });
postSchema.index({ 'platforms.platform': 1 });
postSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Post', postSchema);
