const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth } = require('../middleware/auth');

// Routes
router.get('/dashboard', auth, analyticsController.getDashboardStats);
router.get('/', auth, analyticsController.getAnalytics);
router.get('/posts/:id', auth, analyticsController.getPostAnalytics);
router.get('/platform/:platform', auth, analyticsController.getPlatformAnalytics);
router.get('/best-time-to-post', auth, analyticsController.getBestTimeToPost);
router.get('/export', auth, analyticsController.exportAnalytics);

module.exports = router;
