const mongoose = require('mongoose');

const dailyMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  posts: {
    total: { type: Number, default: 0 },
    published: { type: Number, default: 0 },
    scheduled: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  engagement: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  reach: {
    type: Number,
    default: 0
  },
  impressions: {
    type: Number,
    default: 0
  },
  followers: {
    gained: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    net: { type: Number, default: 0 }
  },
  profileViews: {
    type: Number,
    default: 0
  },
  websiteClicks: {
    type: Number,
    default: 0 }
});

const platformAnalyticsSchema = new mongoose.Schema({
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
  dailyMetrics: [dailyMetricsSchema],
  summary: {
    totalPosts: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalFollowers: { type: Number, default: 0 },
    followerGrowth: { type: Number, default: 0 },
    bestPerformingPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null
    },
    topHashtags: [{ tag: String, count: Number }],
    bestPostingTimes: [{ hour: Number, engagement: Number }]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const analyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateRange: {
    start: Date,
    end: Date
  },
  overall: {
    totalPosts: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalFollowers: { type: Number, default: 0 },
    followerGrowth: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 }
  },
  byPlatform: [platformAnalyticsSchema],
  contentPerformance: [{
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    engagementRate: Number,
    reach: Number,
    impressions: Number,
    score: Number
  }],
  audienceDemographics: {
    age: [{
      range: String,
      percentage: Number
    }],
    gender: [{
      type: String,
      percentage: Number
    }],
    location: [{
      country: String,
      city: String,
      percentage: Number
    }],
    interests: [{
      name: String,
      percentage: Number
    }],
    activeHours: [{
      hour: Number,
      activity: Number
    }]
  },
  growthTrend: [{
    date: Date,
    followers: Number,
    engagement: Number
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

analyticsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

analyticsSchema.index({ user: 1 });
analyticsSchema.index({ 'byPlatform.platform': 1 });
analyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
