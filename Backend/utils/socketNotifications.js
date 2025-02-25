// socketNotifications.js
const Notification = require('../models/Notification');

const initializeSocketNotifications = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a user-specific room
    socket.on('joinUser', (userId) => {
      socket.join(userId);
      console.log(`User ${socket.id} joined room ${userId}`);
    });

    // Emit notification to a specific user
    const sendNotification = async (userId, message, link = null) => {
      try {
        // Create a notification in the database
        const notification = await Notification.create({
          user: userId,
          message,
          link,
        });

        // Emit the notification in real-time
        io.to(userId).emit('newNotification', notification);
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    };

    // Listen for disconnect events
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });

    // Return the sendNotification function for use elsewhere
    return sendNotification;
  });
};

module.exports = initializeSocketNotifications;
