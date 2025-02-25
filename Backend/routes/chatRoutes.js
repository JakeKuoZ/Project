// chatRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createOrGetChat,
  deleteChat,
  sendMessage,
  getMessages,
} = require('../controllers/chatController');
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

// Create or fetch an existing chat with a target user
router.post('/init', protect, createOrGetChat);

// Delete a chat
router.delete('/:chatId', protect, deleteChat);

// Route to send a new message with optional file uploads (protected)
router.post('/', protect, upload.single('file'), sendMessage);

// Route to get chat messages (protected)
router.get('/:chatId', protect, getMessages);

module.exports = router;