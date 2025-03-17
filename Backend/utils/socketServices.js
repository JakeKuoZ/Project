// socketService.js - Enhanced socket connection handling with token refreshing

import io from 'socket.io-client';
import axios from 'axios';
import API_BASE_URL from '../config';

// Singleton socket instance
let socket = null;
let reconnectTimer = null;

// Create a function to initialize or get the socket
export const getSocket = () => {
  return socket;
};

// Function to create and configure the socket
export const initSocket = (token, userId) => {
  if (!token || !userId) {
    console.error('Cannot initialize socket: token or userId missing');
    return null;
  }

  // If socket already exists and is connected, return it
  if (socket && socket.connected) {
    console.log('Socket already connected, reusing');
    return socket;
  }

  // Clear any pending reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Create new socket connection
  console.log('Creating new socket connection for user:', userId);
  
  socket = io(API_BASE_URL, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket'],
    upgrade: false,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Setup standard event handlers
  socket.on('connect', () => {
    console.log('Socket connected with ID:', socket.id);
    
    // Join user's personal room to receive direct notifications
    socket.emit('joinUser', userId);
    
    // Store socket ID in localStorage for debugging
    localStorage.setItem('socketId', socket.id);
    localStorage.setItem('socketConnectedAt', new Date().toISOString());
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    
    // Check if error is auth-related and try to refresh token
    if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      refreshTokenAndReconnect(userId);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected, reason:', reason);
    
    // Store disconnect info for debugging
    localStorage.setItem('socketDisconnectedAt', new Date().toISOString());
    localStorage.setItem('socketDisconnectReason', reason);
    
    // If the server forced disconnect due to authentication
    if (reason === 'io server disconnect') {
      // Try to refresh token and reconnect after a short delay
      reconnectTimer = setTimeout(() => {
        refreshTokenAndReconnect(userId);
      }, 3000);
    }
  });

  return socket;
};

// Function to disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    console.log('Manually disconnecting socket');
    socket.disconnect();
    socket = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

// Helper function to refresh token and reconnect
const refreshTokenAndReconnect = async (userId) => {
  console.log('Attempting to refresh token and reconnect socket');
  
  try {
    // This assumes you have a token refresh endpoint
    // Adjust this based on your actual authentication system
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.error('No refresh token available');
      
      // If you have a central auth handler, you can redirect to login
      // window.location.href = '/login'; 
      return;
    }
    
    const response = await axios.post(`${API_BASE_URL}api/auth/refresh`, { 
      refreshToken 
    });
    
    if (response.data && response.data.token) {
      console.log('Token refreshed successfully');
      
      // Save the new token
      localStorage.setItem('token', response.data.token);
      
      // Reconnect with new token
      disconnectSocket();
      initSocket(response.data.token, userId);
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
    
    // Could handle forcing user to log in again here
    // Perhaps emit a custom event that your app listens for
    const event = new CustomEvent('auth:tokenExpired');
    window.dispatchEvent(event);
  }
};

// Function to join a specific chat room
export const joinChatRoom = (chatId) => {
  if (!socket || !socket.connected) {
    console.error('Cannot join chat room: socket not connected');
    return false;
  }
  
  console.log('Joining chat room:', chatId);
  socket.emit('joinChat', chatId);
  return true;
};

// Function to emit typing indicators
export const emitTyping = (chatId, userId, userName, isTyping) => {
  if (!socket || !socket.connected) {
    console.error('Cannot emit typing: socket not connected');
    return false;
  }
  
  const event = isTyping ? 'typing' : 'stopTyping';
  socket.emit(event, { chatId, userId, userName });
  return true;
};

// Function to send a message
export const sendMessage = (messageData) => {
  if (!socket || !socket.connected) {
    console.error('Cannot send message: socket not connected');
    return false;
  }
  
  socket.emit('sendMessage', messageData);
  return true;
};

export default {
  initSocket,
  disconnectSocket,
  getSocket,
  joinChatRoom,
  emitTyping,
  sendMessage
};