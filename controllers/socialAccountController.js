const { SocialAccount } = require('../models');

exports.getAccounts = async (req, res) => {
  try {
    const { platform, isConnected } = req.query;
    
    const query = { user: req.user._id };
    if (platform) query.platform = platform;
    if (isConnected !== undefined) query.isConnected = isConnected === 'true';

    const accounts = await SocialAccount.find(query)
      .sort({ platform: 1, name: 1 });

    res.json({
      success: true,
      data: { accounts }
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: { account }
    });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.connectAccount = async (req, res) => {
  try {
    const {
      platform,
      name,
      username,
      profilePicture,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      platformUserId,
      pageId,
      pageAccessToken,
      permissions,
      accountType
    } = req.body;

    // Check if account already exists
    const existingAccount = await SocialAccount.findOne({
      platformUserId,
      platform
    });

    if (existingAccount) {
      // Update existing account
      existingAccount.user = req.user._id;
      existingAccount.name = name;
      existingAccount.username = username;
      existingAccount.profilePicture = profilePicture;
      existingAccount.accessToken = accessToken;
      existingAccount.refreshToken = refreshToken;
      existingAccount.tokenExpiresAt = tokenExpiresAt;
      existingAccount.pageId = pageId;
      existingAccount.pageAccessToken = pageAccessToken;
      existingAccount.permissions = permissions;
      existingAccount.accountType = accountType;
      existingAccount.isConnected = true;
      existingAccount.connectedAt = new Date();
      existingAccount.disconnectedAt = null;

      await existingAccount.save();

      return res.json({
        success: true,
        message: 'Account reconnected successfully',
        data: { account: existingAccount }
      });
    }

    // Create new account
    const account = new SocialAccount({
      user: req.user._id,
      platform,
      name,
      username,
      profilePicture,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      platformUserId,
      pageId,
      pageAccessToken,
      permissions,
      accountType: accountType || 'personal'
    });

    await account.save();

    res.status(201).json({
      success: true,
      message: 'Account connected successfully',
      data: { account }
    });
  } catch (error) {
    console.error('Connect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.disconnectAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    account.isConnected = false;
    account.disconnectedAt = new Date();
    account.accessToken = null;
    account.refreshToken = null;
    account.pageAccessToken = null;

    await account.save();

    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    await SocialAccount.deleteOne({ _id: account._id });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.updateAccountSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    const account = await SocialAccount.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    account.settings = { ...account.settings, ...settings };
    await account.save();

    res.json({
      success: true,
      message: 'Account settings updated',
      data: { account }
    });
  } catch (error) {
    console.error('Update account settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.refreshAccountToken = async (req, res) => {
  try {
    const account = await SocialAccount.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // TODO: Implement token refresh logic based on platform
    // This would use the platform's OAuth refresh token endpoint

    res.json({
      success: true,
      message: 'Token refresh initiated'
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.syncAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // TODO: Implement account sync logic
    // This would fetch latest profile data from the platform

    account.lastSyncedAt = new Date();
    await account.save();

    res.json({
      success: true,
      message: 'Account synced successfully',
      data: { account }
    });
  } catch (error) {
    console.error('Sync account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getPlatformStats = async (req, res) => {
  try {
    const stats = await SocialAccount.aggregate([
      { $match: { user: req.user._id, isConnected: true } },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          totalFollowers: { $sum: '$followersCount' },
          totalPosts: { $sum: '$postsCount' }
        }
      }
    ]);

    const formattedStats = stats.reduce((acc, stat) => {
      acc[stat._id] = {
        accounts: stat.count,
        followers: stat.totalFollowers,
        posts: stat.totalPosts
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: { stats: formattedStats }
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
