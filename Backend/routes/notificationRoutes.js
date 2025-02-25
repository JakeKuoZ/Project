// notificationRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getNotifications, markAsRead, createNotification, getNotificationSummary } = require('../controllers/notificationController');

// Get all notifications for a user
router.get('/', protect, getNotifications);

// Mark a notification as read
router.put('/:id/read', protect, markAsRead);

// Get a summary of notifications and chat unread counts
router.get('/summary', protect, getNotificationSummary);

// Create a notification (internal use for events)
router.post('/', protect, createNotification);

module.exports = router;