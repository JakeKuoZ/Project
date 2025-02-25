// chatController.js
const Message = require('../models/Messages');
const Chat = require('../models/Chat');
const mongoose = require('mongoose');

// Send a new message
const createOrGetChat = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    // Check if chat exists using string comparison
    let chat = await Chat.findOne({
      participants: { 
        $all: [
          new mongoose.Types.ObjectId(currentUserId),
          new mongoose.Types.ObjectId(targetUserId)
        ]
      }
    }).populate('participants', 'name email');

    if (!chat) {
      chat = await Chat.create({
        participants: [currentUserId, targetUserId]
      });
      // Populate after creation
      chat = await Chat.findById(chat._id).populate('participants', 'name email');
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteChat = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const currentUserId = req.user.id;

    // Optionally ensure that only participants can delete the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    if (!chat.participants.some((p) => p.toString() === currentUserId)) {
      return res.status(403).json({ error: 'Not authorized to delete this chat' });
    }

    // Delete the messages for that chat
    await Message.deleteMany({ chatId });
    // Delete the chat itself
    await Chat.findByIdAndDelete(chatId);

    res.status(200).json({ message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const sendMessage = async (req, res) => {
  const { chatId, text } = req.body;
  const file = req.file ? req.file.path : null;

  try {
    const message = await Message.create({
      chatId,
      sender: req.user.id,
      text,
      file,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get messages for a specific chat
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  createOrGetChat,
  deleteChat,
};