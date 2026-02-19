const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const mediaController = require('../controllers/mediaController');
const { auth } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload');

// Routes
router.get('/', auth, mediaController.getMedia);
router.get('/folders', auth, mediaController.getFolders);
router.post('/folders', auth, body('name').trim().notEmpty(), mediaController.createFolder);
router.post('/upload', auth, uploadSingle, handleUploadError, mediaController.uploadMedia);
router.post('/upload-multiple', auth, uploadMultiple, handleUploadError, mediaController.uploadMultiple);
router.patch('/:id', auth, mediaController.updateMedia);
router.delete('/:id', auth, mediaController.deleteMedia);

module.exports = router;
