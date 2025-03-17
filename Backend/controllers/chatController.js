// controllers/chatController.js

const Message = require('../models/Messages');
const Chat = require('../models/Chat');
const mongoose = require('mongoose');

const createOrGetChat = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    // Check if chat exists
    let chat = await Chat.findOne({
      participants: {
        $all: [
          new mongoose.Types.ObjectId(currentUserId),
          new mongoose.Types.ObjectId(targetUserId),
        ],
      },
    }).populate('participants', 'name email');

    if (!chat) {
      // If chat doesn't exist, create it
      chat = await Chat.create({
        participants: [currentUserId, targetUserId],
      });
      chat = await Chat.findById(chat._id).populate('participants', 'name email');

      // [ADDED] Emit socket event to the *other user* so they know a new chat was created
      // We'll put them in a "room" named by their userId (we do this in socket.js's 'joinUser'),
      // so we can do: req.io.to(<targetUserId>).emit(...)
      req.io.to(targetUserId).emit('newChat', chat);

      // Optionally also emit to the current user so *they* get an updated chat list in real time 
      // (in case you're on a second tab or device).
      req.io.to(currentUserId).emit('newChat', chat);
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
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    if (!chat.participants.some((p) => p.toString() === currentUserId)) {
      return res.status(403).json({ error: 'Not authorized' });
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
    // Save message to DB
    const message = await Message.create({
      chatId,
      sender: req.user.id,
      text,
      file,
    });

    // Update chat timestamp
    await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

    // Only send HTTP response
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
};

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

const getUserChats = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const chats = await Chat.find({
      participants: currentUserId,
    })
      .populate('participants', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json(chats);
  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  createOrGetChat,
  deleteChat,
  getUserChats,
};
