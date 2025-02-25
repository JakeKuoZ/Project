// articleController.js
const fs = require('fs');
const Article = require('../models/Articles');
const multer = require('multer');

// Create a new article
const createArticle = async (req, res) => {
  try {
    // Add error handling for file size limits
    if (req.files?.some(file => file.size > 10 * 1024 * 1024)) {
      return res.status(413).json({ error: 'One or more files exceed 10MB limit' });
    }

    // ... rest of the existing code
  } catch (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size too large' });
      }
    }
    res.status(500).json({ error: error.message });
  }
  const { title, content, htmlContent } = req.body;

  // Store only the 'filename' from each uploaded file, not the absolute path
  const files = req.files ? req.files.map((file) => file.filename) : [];

  try {
    const article = await Article.create({
      title,
      content,
      htmlContent,
      files,              // <-- e.g. ["1688562345678-myfile.pdf", ...]
      author: req.user.id,
    });
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all articles with search, filter, and pagination
const getArticles = async (req, res) => {
  const {
    search,
    author,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = req.query;

  try {
    const query = {};

    // Search by title or content
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by author
    if (author) {
      query.author = author;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (page - 1) * limit;
    const articles = await Article.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Article.countDocuments(query);

    res.status(200).json({
      articles,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get an article by ID
const getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('author', 'name email');
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.status(200).json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an article by ID
const updateArticle = async (req, res) => {
  const { title, content, htmlContent } = req.body;

  // Again, store only filenames
  const newFiles = req.files ? req.files.map((file) => file.filename) : [];

  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Check if the user is the article author
    if (article.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this article' });
    }

    // Update fields
    article.title = title || article.title;
    article.content = content || article.content;
    article.htmlContent = htmlContent || article.htmlContent;

    // If new files are uploaded, remove old files from disk & replace
    if (newFiles.length > 0) {
      // Remove old files from disk
      article.files.forEach((filename) => {
        const filePath = `uploads/${filename}`;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      // Replace with the new files
      article.files = newFiles;
    }

    const updatedArticle = await article.save();
    res.status(200).json(updatedArticle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete an article by ID
const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Example: only admin can delete (as per your original code)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this article' });
    }

    // Remove associated files from disk
    article.files.forEach((filename) => {
      const filePath = `uploads/${filename}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await article.remove();
    res.status(200).json({ message: 'Article removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// In your file upload middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

module.exports = {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
};
