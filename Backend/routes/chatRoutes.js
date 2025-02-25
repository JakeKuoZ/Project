// chatRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { sendMessage, getMessages } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/chat/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Route to send a new message with optional file uploads (protected)
router.post('/', protect, upload.single('file'), sendMessage);

// Route to get chat messages between users (protected)
router.get('/:chatId', protect, getMessages);

module.exports = router;