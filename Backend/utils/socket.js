// socket.js - UPDATED VERSION
const Chat = require('../models/Chat');

const initializeSocket = (io) => {  // Accept io instead of server
  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);
    console.log('Auth token:', socket.handshake.auth.token);

    // Join a chat room
    socket.on('joinChat', (chatId) => {
      console.log(`User ${socket.id} joined chat ${chatId}`);
      console.log('Current rooms:', socket.rooms); 
      socket.join(chatId);
      console.log('After join, rooms:', socket.rooms);
    });

    // Handle sending messages
    socket.on('sendMessage', async (message) => {
      try {
        console.log('RECEIVED MESSAGE:', message);
        console.log('MESSAGE SENDER:', message.sender);
        console.log('MESSAGE CHAT:', message.chatId);
        
        const chat = await Chat.findById(message.chatId)
          .populate('participants', '_id')
          .lean();
        
        if (!chat) {
          console.error('Chat not found:', message.chatId);
          socket.emit('messageError', { error: 'Chat not found' });
          return;
        }

        // Save message to database
        const Message = require('../models/Messages');
        const savedMessage = await Message.create({
          chatId: message.chatId,
          sender: message.sender,
          text: message.text,
          file: message.file
        });
        
        console.log('Message saved successfully:', savedMessage._id);

        // Populate sender info
        const populatedMessage = await Message.findById(savedMessage._id)
          .populate('sender', 'name email')
          .lean();

        const receiver = chat.participants.find(p => p._id.toString() !== message.sender);
        console.log('Identified receiver:', receiver?._id.toString());

        // Update chat timestamp
        await Chat.findByIdAndUpdate(message.chatId, { updatedAt: new Date() });

        // Broadcast saved message to chat room
        io.to(message.chatId).emit('receiveMessage', populatedMessage);
        console.log('Emitted receiveMessage to room:', message.chatId);

        // Notify receiver
        if (receiver) {
          io.to(receiver._id.toString()).emit('newMessageNotification', {
            chatId: message.chatId,
            chat: chat,
            message: populatedMessage
          });
          console.log('Emitted notification to:', receiver._id.toString());
        }
      } catch (error) {
        console.error('Message handling error:', error);
        console.error('ERROR DETAILS:', error.stack);
        socket.emit('messageError', { error: error.message });
      }
    });

    // Add this handler for joining user rooms
    socket.on('joinUser', (userId) => {
      console.log(`User ${socket.id} joined user room ${userId}`);
      socket.join(userId);
    });

    // Add typing indicator handlers
    socket.on('typing', ({ chatId, userId, userName }) => {
      socket.to(chatId).emit('userTyping', { chatId, userId, userName });
    });

    socket.on('stopTyping', ({ chatId, userId, userName }) => {
      socket.to(chatId).emit('userStoppedTyping', { chatId, userId, userName });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = initializeSocket;