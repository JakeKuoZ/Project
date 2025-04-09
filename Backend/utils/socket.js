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
        
        // First save the message
        const Message = require('../models/Messages');
        const savedMessage = await Message.create({
          chatId: message.chatId,
          sender: message.sender,
          text: message.text,
          file: message.file
        });
        
        console.log('Message saved successfully:', savedMessage._id);
        
        // Update chat timestamp
        await Chat.findByIdAndUpdate(message.chatId, { updatedAt: new Date() });
        
        // Now fetch the FULLY POPULATED chat to send back to clients
        const fullChat = await Chat.findById(message.chatId)
          .populate('participants', 'name email')
          .lean();
        
        if (!fullChat) {
          console.error('Chat not found after saving message');
          socket.emit('messageError', { error: 'Chat data could not be retrieved' });
          return;
        }
        
        // Get fully populated message
        const populatedMessage = await Message.findById(savedMessage._id)
          .populate('sender', 'name email')
          .lean();
        
        // Create a complete response with both message and chat data
        const responseData = {
          ...populatedMessage,
          chat: fullChat
        };
        
        // Emit to the chat room with COMPLETE data
        io.to(message.chatId).emit('receiveMessage', responseData);
        
        // Also notify other participants individually to ensure they get the full data
        for (const participant of fullChat.participants) {
          // Skip the sender
          if (participant._id.toString() !== message.sender) {
            io.to(participant._id.toString()).emit('newMessageNotification', {
              chatId: message.chatId,
              chat: fullChat,
              message: populatedMessage
            });
          }
        }
      } catch (error) {
        console.error('Message handling error:', error);
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