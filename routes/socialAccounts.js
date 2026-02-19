const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const socialAccountController = require('../controllers/socialAccountController');
const { auth } = require('../middleware/auth');

// Validation middleware
const connectValidation = [
  body('platform').isIn(['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest']).withMessage('Valid platform is required'),
  body('name').trim().notEmpty().withMessage('Account name is required'),
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('accessToken').notEmpty().withMessage('Access token is required'),
  body('platformUserId').notEmpty().withMessage('Platform user ID is required')
];

// Routes
router.get('/', auth, socialAccountController.getAccounts);
router.get('/stats', auth, socialAccountController.getPlatformStats);
router.get('/:id', auth, socialAccountController.getAccount);
router.post('/connect', auth, connectValidation, socialAccountController.connectAccount);
router.post('/:id/disconnect', auth, socialAccountController.disconnectAccount);
router.delete('/:id', auth, socialAccountController.deleteAccount);
router.patch('/:id/settings', auth, socialAccountController.updateAccountSettings);
router.post('/:id/refresh', auth, socialAccountController.refreshAccountToken);
router.post('/:id/sync', auth, socialAccountController.syncAccount);

module.exports = router;
