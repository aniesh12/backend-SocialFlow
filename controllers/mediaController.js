const { Media } = require('../models');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.getMedia = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      folder,
      search,
      isUsed
    } = req.query;

    const query = { user: req.user._id };
    if (type) query.type = type;
    if (folder) query.folder = folder;
    if (isUsed !== undefined) query.isUsed = isUsed === 'true';
    if (search) {
      query.$or = [
        { filename: { $regex: search, $options: 'i' } },
        { caption: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Media.countDocuments(query);

    // Get folders
    const folders = await Media.distinct('folder', { user: req.user._id });

    res.json({
      success: true,
      data: {
        media,
        folders,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { folder = 'uncategorized', caption, tags, altText } = req.body;

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `socialflow/${req.user._id}/${folder}`,
          resource_type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
          transformation: req.file.mimetype.startsWith('image/') ? [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ] : undefined
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const media = new Media({
      user: req.user._id,
      filename: result.public_id,
      originalName: req.file.originalname,
      type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: result.secure_url,
      thumbnail: result.thumbnail_url || result.secure_url,
      dimensions: {
        width: result.width,
        height: result.height
      },
      duration: result.duration || null,
      caption: caption || '',
      altText: altText || '',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      folder
    });

    await media.save();

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: { media }
    });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { folder = 'uncategorized' } = req.body;
    const uploadedMedia = [];

    for (const file of req.files) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `socialflow/${req.user._id}/${folder}`,
            resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

      const media = new Media({
        user: req.user._id,
        filename: result.public_id,
        originalName: file.originalname,
        type: file.mimetype.startsWith('video/') ? 'video' : 'image',
        mimeType: file.mimetype,
        size: file.size,
        url: result.secure_url,
        thumbnail: result.thumbnail_url || result.secure_url,
        dimensions: {
          width: result.width,
          height: result.height
        },
        folder
      });

      await media.save();
      uploadedMedia.push(media);
    }

    res.status(201).json({
      success: true,
      message: `${uploadedMedia.length} files uploaded successfully`,
      data: { media: uploadedMedia }
    });
  } catch (error) {
    console.error('Upload multiple error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.updateMedia = async (req, res) => {
  try {
    const { caption, tags, altText, folder } = req.body;
    
    const media = await Media.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    if (caption !== undefined) media.caption = caption;
    if (altText !== undefined) media.altText = altText;
    if (folder !== undefined) media.folder = folder;
    if (tags !== undefined) media.tags = tags.split(',').map(t => t.trim());

    await media.save();

    res.json({
      success: true,
      message: 'Media updated successfully',
      data: { media }
    });
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.deleteMedia = async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(media.filename, {
        resource_type: media.type === 'video' ? 'video' : 'image'
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary delete error:', cloudinaryError);
    }

    await Media.deleteOne({ _id: media._id });

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getFolders = async (req, res) => {
  try {
    const folders = await Media.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$folder',
          count: { $sum: 1 },
          size: { $sum: '$size' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: { folders }
    });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.createFolder = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Folders are created implicitly when media is uploaded
    // This endpoint just validates the folder name
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      });
    }

    res.json({
      success: true,
      message: 'Folder ready',
      data: { folder: name.trim() }
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
