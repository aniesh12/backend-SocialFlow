const { Analytics, Post, SocialAccount } = require('../models');

exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get posts stats
    const postsQuery = { user: req.user._id, isDeleted: false };
    if (Object.keys(dateFilter).length > 0) {
      postsQuery.createdAt = dateFilter;
    }

    const [
      totalPosts,
      publishedPosts,
      scheduledPosts,
      failedPosts,
      draftPosts
    ] = await Promise.all([
      Post.countDocuments(postsQuery),
      Post.countDocuments({ ...postsQuery, status: 'published' }),
      Post.countDocuments({ ...postsQuery, status: 'scheduled' }),
      Post.countDocuments({ ...postsQuery, status: 'failed' }),
      Post.countDocuments({ ...postsQuery, status: 'draft' })
    ]);

    // Get connected accounts count
    const connectedAccounts = await SocialAccount.countDocuments({
      user: req.user._id,
      isConnected: true
    });

    // Get platform breakdown
    const platformBreakdown = await SocialAccount.aggregate([
      { $match: { user: req.user._id, isConnected: true } },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          followers: { $sum: '$followersCount' }
        }
      }
    ]);

    // Get recent posts
    const recentPosts = await Post.find(postsQuery)
      .populate('platforms.account', 'name platform profilePicture')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate engagement (mock data for now)
    const totalEngagement = Math.floor(Math.random() * 10000) + 1000;
    const avgEngagementRate = (Math.random() * 5 + 1).toFixed(2);
    const totalReach = Math.floor(Math.random() * 100000) + 10000;
    const totalImpressions = Math.floor(Math.random() * 500000) + 50000;

    res.json({
      success: true,
      data: {
        overview: {
          totalPosts,
          publishedPosts,
          scheduledPosts,
          failedPosts,
          draftPosts,
          connectedAccounts,
          totalEngagement,
          avgEngagementRate: parseFloat(avgEngagementRate),
          totalReach,
          totalImpressions
        },
        platformBreakdown,
        recentPosts
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { platform, startDate, endDate, metric } = req.query;

    const query = { user: req.user._id };
    if (platform) query['byPlatform.platform'] = platform;

    const analytics = await Analytics.findOne(query)
      .populate('byPlatform.account', 'name username platform profilePicture')
      .populate('contentPerformance.post', 'title content media');

    if (!analytics) {
      // Return mock data if no analytics exist
      return res.json({
        success: true,
        data: {
          overall: {
            totalPosts: 0,
            totalEngagement: 0,
            avgEngagementRate: 0,
            totalReach: 0,
            totalImpressions: 0,
            totalFollowers: 0,
            followerGrowth: 0,
            totalClicks: 0,
            totalViews: 0
          },
          byPlatform: [],
          contentPerformance: [],
          audienceDemographics: {
            age: [],
            gender: [],
            location: [],
            interests: [],
            activeHours: []
          },
          growthTrend: []
        }
      });
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getPostAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findOne({
      _id: id,
      user: req.user._id
    }).populate('platforms.account', 'name username platform profilePicture');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Aggregate platform engagement
    const platformBreakdown = post.platforms.map(p => ({
      platform: p.platform,
      account: p.account,
      status: p.status,
      postedAt: p.postedAt,
      engagement: p.engagement,
      postUrl: p.postUrl
    }));

    const totalEngagement = post.platforms.reduce((sum, p) => 
      sum + (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0), 0
    );

    res.json({
      success: true,
      data: {
        post: {
          id: post._id,
          title: post.title,
          content: post.content,
          media: post.media,
          status: post.status,
          createdAt: post.createdAt,
          publishedAt: post.publishedAt
        },
        analytics: {
          totalEngagement,
          totalReach: post.analytics?.totalReach || 0,
          totalImpressions: post.analytics?.totalImpressions || 0,
          engagementRate: post.analytics?.engagementRate || 0,
          platformBreakdown
        }
      }
    });
  } catch (error) {
    console.error('Get post analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getPlatformAnalytics = async (req, res) => {
  try {
    const { platform } = req.params;
    const { startDate, endDate } = req.query;

    const accounts = await SocialAccount.find({
      user: req.user._id,
      platform,
      isConnected: true
    });

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No accounts found for this platform'
      });
    }

    // Get posts for this platform
    const postsQuery = {
      user: req.user._id,
      'platforms.platform': platform,
      isDeleted: false
    };

    if (startDate || endDate) {
      postsQuery.createdAt = {};
      if (startDate) postsQuery.createdAt.$gte = new Date(startDate);
      if (endDate) postsQuery.createdAt.$lte = new Date(endDate);
    }

    const posts = await Post.find(postsQuery)
      .populate('platforms.account', 'name username profilePicture')
      .sort({ createdAt: -1 });

    // Calculate metrics
    const totalPosts = posts.length;
    const publishedPosts = posts.filter(p => p.status === 'published').length;
    const totalEngagement = posts.reduce((sum, p) => 
      sum + (p.analytics?.totalEngagement || 0), 0
    );
    const totalReach = posts.reduce((sum, p) => 
      sum + (p.analytics?.totalReach || 0), 0
    );

    const avgEngagementRate = totalPosts > 0 
      ? (totalEngagement / totalPosts).toFixed(2) 
      : 0;

    // Generate daily metrics (mock data)
    const dailyMetrics = [];
    const days = 30;
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyMetrics.push({
        date: date.toISOString().split('T')[0],
        posts: Math.floor(Math.random() * 5),
        engagement: Math.floor(Math.random() * 500),
        reach: Math.floor(Math.random() * 5000),
        impressions: Math.floor(Math.random() * 15000),
        followers: Math.floor(Math.random() * 50)
      });
    }

    res.json({
      success: true,
      data: {
        platform,
        accounts,
        summary: {
          totalPosts,
          publishedPosts,
          totalEngagement,
          avgEngagementRate: parseFloat(avgEngagementRate),
          totalReach,
          totalFollowers: accounts.reduce((sum, a) => sum + a.followersCount, 0)
        },
        dailyMetrics: dailyMetrics.reverse(),
        recentPosts: posts.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getBestTimeToPost = async (req, res) => {
  try {
    const { platform } = req.query;

    // Mock best times data
    const bestTimes = [
      { day: 'Monday', hours: [9, 12, 17], engagement: [45, 78, 92] },
      { day: 'Tuesday', hours: [8, 11, 15, 19], engagement: [52, 85, 67, 88] },
      { day: 'Wednesday', hours: [9, 13, 17], engagement: [48, 82, 95] },
      { day: 'Thursday', hours: [8, 12, 16, 20], engagement: [55, 79, 71, 90] },
      { day: 'Friday', hours: [10, 14, 18], engagement: [62, 75, 85] },
      { day: 'Saturday', hours: [11, 15, 19], engagement: [70, 68, 80] },
      { day: 'Sunday', hours: [12, 16, 20], engagement: [65, 72, 78] }
    ];

    res.json({
      success: true,
      data: { bestTimes }
    });
  } catch (error) {
    console.error('Get best time error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.exportAnalytics = async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;

    // Get analytics data
    const posts = await Post.find({
      user: req.user._id,
      status: 'published',
      isDeleted: false
    }).populate('platforms.account', 'name platform');

    const data = posts.map(post => ({
      id: post._id,
      title: post.title,
      content: post.content.substring(0, 100),
      platforms: post.platforms.map(p => p.platform).join(', '),
      publishedAt: post.publishedAt,
      engagement: post.analytics?.totalEngagement || 0,
      reach: post.analytics?.totalReach || 0,
      impressions: post.analytics?.totalImpressions || 0
    }));

    if (format === 'csv') {
      const csvHeader = 'ID,Title,Content,Platforms,Published At,Engagement,Reach,Impressions\n';
      const csvRows = data.map(row => 
        `${row.id},"${row.title}","${row.content}","${row.platforms}",${row.publishedAt},${row.engagement},${row.reach},${row.impressions}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      return res.send(csvHeader + csvRows);
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
