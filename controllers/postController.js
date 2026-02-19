const { Post, SocialAccount } = require('../models');
const { validationResult } = require('express-validator');

exports.getPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      platform,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      startDate,
      endDate
    } = req.query;

    const query = { user: req.user._id, isDeleted: false };

    if (status) query.status = status;
    if (platform) query['platforms.platform'] = platform;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const posts = await Post.find(query)
      .populate('platforms.account', 'name username platform profilePicture')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Post.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    }).populate('platforms.account', 'name username platform profilePicture');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      data: { post }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      title,
      content,
      platforms,
      scheduledAt,
      timezone,
      postType,
      tags,
      location,
      settings,
      media
    } = req.body;

    // Validate platforms
    const accountIds = platforms.map(p => p.account);
    const accounts = await SocialAccount.find({
      _id: { $in: accountIds },
      user: req.user._id,
      isConnected: true
    });

    if (accounts.length !== accountIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more social accounts are invalid or disconnected'
      });
    }

    // Build platform posts
    const platformPosts = platforms.map(platform => ({
      platform: platform.platform,
      account: platform.account,
      status: scheduledAt ? 'scheduled' : 'pending'
    }));

    const post = new Post({
      user: req.user._id,
      title,
      content,
      platforms: platformPosts,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      timezone: timezone || req.user.timezone || 'UTC',
      postType: postType || 'post',
      tags: tags || [],
      location,
      settings,
      media: media || [],
      status: scheduledAt ? 'scheduled' : 'draft'
    });

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('platforms.account', 'name username platform profilePicture');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: { post: populatedPost }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const {
      title,
      content,
      platforms,
      scheduledAt,
      timezone,
      postType,
      tags,
      location,
      settings,
      media
    } = req.body;

    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Don't allow editing published posts
    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit published posts'
      });
    }

    // Update fields
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (scheduledAt !== undefined) {
      post.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      post.status = scheduledAt ? 'scheduled' : 'draft';
    }
    if (timezone !== undefined) post.timezone = timezone;
    if (postType !== undefined) post.postType = postType;
    if (tags !== undefined) post.tags = tags;
    if (location !== undefined) post.location = location;
    if (settings !== undefined) post.settings = { ...post.settings, ...settings };
    if (media !== undefined) post.media = media;

    // Update platforms if provided
    if (platforms && platforms.length > 0) {
      const accountIds = platforms.map(p => p.account);
      const accounts = await SocialAccount.find({
        _id: { $in: accountIds },
        user: req.user._id,
        isConnected: true
      });

      if (accounts.length !== accountIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more social accounts are invalid or disconnected'
        });
      }

      post.platforms = platforms.map(platform => ({
        platform: platform.platform,
        account: platform.account,
        status: post.scheduledAt ? 'scheduled' : 'pending'
      }));
    }

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('platforms.account', 'name username platform profilePicture');

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: { post: populatedPost }
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.isDeleted = true;
    await post.save();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.publishPost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Post is already published'
      });
    }

    // Update status to publishing
    post.status = 'publishing';
    post.platforms.forEach(p => {
      if (p.status !== 'published') {
        p.status = 'publishing';
      }
    });
    await post.save();

    // TODO: Implement actual publishing logic to social platforms
    // This would be handled by a background job or queue

    res.json({
      success: true,
      message: 'Post is being published',
      data: { post }
    });
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.schedulePost = async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot schedule published posts'
      });
    }

    post.scheduledAt = new Date(scheduledAt);
    post.status = 'scheduled';
    post.platforms.forEach(p => {
      if (p.status !== 'published') {
        p.status = 'scheduled';
      }
    });
    await post.save();

    res.json({
      success: true,
      message: 'Post scheduled successfully',
      data: { post }
    });
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.cancelScheduledPost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Post is not scheduled'
      });
    }

    post.status = 'draft';
    post.scheduledAt = null;
    post.platforms.forEach(p => {
      p.status = 'cancelled';
    });
    await post.save();

    res.json({
      success: true,
      message: 'Scheduled post cancelled',
      data: { post }
    });
  } catch (error) {
    console.error('Cancel scheduled post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.duplicatePost = async (req, res) => {
  try {
    const originalPost = await Post.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const newPost = new Post({
      user: req.user._id,
      title: `${originalPost.title} (Copy)`,
      content: originalPost.content,
      platforms: originalPost.platforms.map(p => ({
        platform: p.platform,
        account: p.account,
        status: 'pending'
      })),
      postType: originalPost.postType,
      tags: originalPost.tags,
      location: originalPost.location,
      settings: originalPost.settings,
      media: originalPost.media,
      status: 'draft'
    });

    await newPost.save();

    const populatedPost = await Post.findById(newPost._id)
      .populate('platforms.account', 'name username platform profilePicture');

    res.status(201).json({
      success: true,
      message: 'Post duplicated successfully',
      data: { post: populatedPost }
    });
  } catch (error) {
    console.error('Duplicate post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getScheduledPosts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {
      user: req.user._id,
      isDeleted: false,
      status: 'scheduled'
    };

    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = new Date(startDate);
      if (endDate) query.scheduledAt.$lte = new Date(endDate);
    }

    const posts = await Post.find(query)
      .populate('platforms.account', 'name username platform profilePicture')
      .sort({ scheduledAt: 1 });

    res.json({
      success: true,
      data: { posts }
    });
  } catch (error) {
    console.error('Get scheduled posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
