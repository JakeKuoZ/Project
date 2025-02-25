// notificationController.js
const Notification = require('../models/Notification');
const Message = require('../models/Messages');

// Get all notifications for the logged-in user
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a notification (internal use)
const createNotification = async (req, res) => {
  const { user, message, link } = req.body;

  try {
    const notification = await Notification.create({
      user,
      message,
      link,
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a summary of notifications and unread messages
const getNotificationSummary = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id, isRead: false });

    const unreadChats = await Message.aggregate([
      { $match: { isRead: false, sender: { $ne: req.user.id } } },
      { $group: { _id: '$chatId', unreadCount: { $sum: 1 } } },
    ]);

    res.status(200).json({
      notifications,
      chats: unreadChats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  createNotification,
  getNotificationSummary,
};