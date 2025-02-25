// articleRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createArticle, getArticles, getArticleById, updateArticle, deleteArticle } = require('../controllers/articleController');
const { protect } = require('../middleware/authMiddleware');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 5MB limit per file
});

// Route to create a new article with optional file uploads (protected)
router.post('/', protect, upload.array('files', 5), createArticle);

// Route to fetch all articles with search, filter, and pagination
router.get('/', getArticles);

// Route to fetch a specific article by ID
router.get('/:id', getArticleById);

// Route to update an article by ID with optional file uploads (protected)
router.put('/:id', protect, upload.array('files', 5), updateArticle);

// Route to delete an article by ID (protected, admin only)
router.delete('/:id', protect, deleteArticle);

module.exports = router;