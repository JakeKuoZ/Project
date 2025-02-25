// chatController.js
const Message = require('../models/Messages');

// Send a new message
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
};