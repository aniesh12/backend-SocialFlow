const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const postController = require('../controllers/postController');
const { auth } = require('../middleware/auth');

// Validation middleware
const postValidation = [
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('platforms').isArray({ min: 1 }).withMessage('At least one platform is required'),
  body('platforms.*.account').isMongoId().withMessage('Valid account ID is required'),
  body('platforms.*.platform').isIn(['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest']).withMessage('Valid platform is required')
];

// Routes
router.get('/', auth, postController.getPosts);
router.get('/scheduled', auth, postController.getScheduledPosts);
router.get('/:id', auth, postController.getPost);
router.post('/', auth, postValidation, postController.createPost);
router.patch('/:id', auth, postController.updatePost);
router.delete('/:id', auth, postController.deletePost);
router.post('/:id/publish', auth, postController.publishPost);
router.post('/:id/schedule', auth, postController.schedulePost);
router.post('/:id/cancel', auth, postController.cancelScheduledPost);
router.post('/:id/duplicate', auth, postController.duplicatePost);

module.exports = router;
