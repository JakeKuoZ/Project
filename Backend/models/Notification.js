// Notification.js (Model)
const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['chat_message', 'ticket_update', 'system', 'friend_request', 'other'],
      default: 'other'
    },
    link: {
      type: String, // Optional link to the relevant resource (e.g., ticket, chat)
    },
    data: {
      type: mongoose.Schema.Types.Mixed, // Any additional data relevant to the notification
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
