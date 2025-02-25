// ticketRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createTicket, getTickets, getTicketById, updateTicket, deleteTicket, assignTicket, addComment } = require('../controllers/ticketController');
const { protect } = require('../middleware/authMiddleware');
const fs = require('fs');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    fs.mkdirSync('uploads', { recursive: true });
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});


// Route to create a new ticket with optional file uploads (protected)
router.post('/', protect, upload.array('files', 5), createTicket);

// Route to fetch all tickets (protected)
router.get('/', protect, getTickets);

// Route to fetch a specific ticket by ID (protected)
router.get('/:id', protect, getTicketById);

// Route to update a ticket by ID with optional file uploads (protected)
router.put('/:id', protect, upload.array('files', 5), updateTicket);

// Route to assign a ticket to an admin (protected, admin only)
router.put('/assign/:id', protect, assignTicket);

// add comment
router.post('/:id/comments', protect, addComment);

// Route to delete a ticket by ID (protected, admin only)
router.delete('/:id', protect, deleteTicket);

module.exports = router;