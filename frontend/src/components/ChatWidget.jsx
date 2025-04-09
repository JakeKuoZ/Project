// ChatWidget.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Fab,
  Drawer,
  IconButton,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  InputAdornment,
  Tooltip,
  Badge,
  ListItemAvatar,
  Avatar,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import GroupIcon from '@mui/icons-material/Group';
import AttachFileIcon from '@mui/icons-material/AttachFile';

import axios from 'axios';
import io from 'socket.io-client';

// Import your base URL from config or define it inline
import API_BASE_URL from '../config';

// If you prefer inline, comment the above import and uncomment below
// const API_BASE_URL = 'http://192.168.86.34:5000/';

const SOCKET_URL = 'http://192.168.86.34:5000';

/** 
 * We keep a top-level socket reference so it isn't reinitialized on every render.
 * This variable is defined outside the component.
 */
let socket = null;

const ChatWidget = () => {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  if (!token || !userId) {
    return null;
  }
  // STATE
  const [open, setOpen] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileAttachment, setFileAttachment] = useState(null);

  // REFS
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const soundRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  
  // Use refs to store handler functions to avoid recreating them on every render
  const handleIncomingMessageRef = useRef(null);
  const handleNewChatRef = useRef(null);


  // Define handler functions as useCallback to maintain referential stability
  const handleIncomingMessage = useCallback((data) => {
    console.log('Received message event:', data);
    console.log('Current selectedChat:', selectedChat?._id);
    console.log('Incoming message chatId:', data.chatId);
    
    // If we've received full chat data with the message, update our chat data
    if (data.chat && data.chat.participants) {
      console.log('Received fully populated chat data with message');
      
      // Update the chat list with this fully populated chat data
      setChatList(prev => {
        const chatIndex = prev.findIndex(chat => chat._id === data.chatId);
        
        if (chatIndex >= 0) {
          // Create a new chats array
          const updatedChats = [...prev];
          
          // Replace the chat with the fully populated version, preserving any fields
          // that might be in our current version but not in the incoming data
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex], // Keep any existing fields
            ...data.chat, // Update with new chat data
            updatedAt: data.createdAt || new Date(),
            lastMessage: data
          };
          
          // Re-sort by most recent
          return updatedChats.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
        }
        
        // If chat not found in our list, we might need to add it
        // But we should have the full data for it at this point
        console.log('Chat not found in list, might need to add it');
        return prev;
      });
    }
    
    // Handle the message itself
    if (selectedChat && data.chatId === selectedChat._id) {
      console.log('Message is for selected chat - adding to messages');
      
      // If we have an updated chat with full participant data, update selectedChat too
      if (data.chat && data.chat.participants) {
        setSelectedChat(prev => ({
          ...prev,
          ...data.chat,
          updatedAt: data.createdAt || new Date(),
          lastMessage: data
        }));
      }
      
      setMessages(prev => {
        // Rest of your existing message handling logic...
        // Check if we already have this message...
        if (prev.some(msg => msg._id === data._id)) {
          return prev;
        }
        
        const tempIndex = prev.findIndex(msg => 
          msg.text === data.text && 
          String(msg.sender).includes(String(data.sender?._id || data.sender)) &&
          Math.abs(new Date(msg.createdAt) - new Date(data.createdAt)) < 10000
        );
        
        if (tempIndex >= 0) {
          const updatedMessages = [...prev];
          updatedMessages[tempIndex] = data;
          return updatedMessages;
        }
        
        return [...prev, data];
      });
      
      setTimeout(scrollToBottom, 50);
    } else {
      // Message is for another chat
      setUnreadCount(prev => prev + 1);
      
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(e => console.log('Failed to play sound:', e));
      }
      
      // If we don't have the chat with this message in our list 
      // but received full chat data, add it
      if (data.chat && data.chat.participants) {
        setChatList(prev => {
          if (!prev.some(chat => chat._id === data.chatId)) {
            return [data.chat, ...prev].sort(
              (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
            );
          }
          return prev;
        });
      }
    }
  }, [selectedChat]);
  

  // When handling a new chat, make sure we don't lose existing data
  const handleNewChat = useCallback((chat) => {
    console.log('New chat received:', chat);
    
    setChatList((prev) => {
      const existingIndex = prev.findIndex((c) => c._id === chat._id);
      if (existingIndex >= 0) {
        // Careful update preserving important fields
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],  // Preserve existing chat data
          ...chat,                   // Add new chat data
          participants: chat.participants || updated[existingIndex].participants  // Ensure participants are preserved
        };
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }
      
      // Brand new chat - add to list and play sound
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(e => console.log('Failed to play sound:', e));
      }
      
      // Increment unread counter for new chats
      setUnreadCount(prev => prev + 1);
      
      return [chat, ...prev].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    });
    
    // Display notification for new chat
    addNotification(`New chat started with ${chat.participants?.find(p => p._id !== userId)?.name || 'a user'}`);
  }, [userId]);

  // Update refs when handler functions change
  useEffect(() => {
    handleIncomingMessageRef.current = handleIncomingMessage;
    handleNewChatRef.current = handleNewChat;
  }, [handleIncomingMessage, handleNewChat]);

  /**
   * Single effect to handle:
   *  1) Socket creation/connection
   *  2) Attaching event listeners (connect, receiveMessage, newChat, etc.)
   *  3) Cleanup (off listeners, disconnect)
   *  4) Also fetch user chats initially
   */
  useEffect(() => {
    if (!token || !userId) {
      console.log('No token or userId, skipping socket initialization');
      return; // if user isn't logged in, skip
    }
    
    if (socket) {
      console.log('Socket already exists, not reinitializing');
      return; // if socket already exists, skip
    }

    console.log('Initializing socket connection for user:', userId);
    
    // --- Initialize the socket ---
    socket = io(SOCKET_URL, {
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

    // Use wrapper functions to ensure we always use the latest reference
    const wrapperIncomingMessage = (data) => {
      console.log('Socket receiveMessage event triggered');
      if (handleIncomingMessageRef.current) {
        handleIncomingMessageRef.current(data);
      }
    };
    
    const wrapperNewChat = (data) => {
      console.log('Socket newChat event triggered');
      if (handleNewChatRef.current) {
        handleNewChatRef.current(data);
      }
    };

    // Local function to log all events for debug
    const logAllEvents = (eventName, ...args) => {
      console.log('Socket Event:', eventName, args);
    };

    // Attach the .onAny logger
    socket.onAny(logAllEvents);

    // On connect
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      console.log('Active rooms:', socket.rooms);
      setSocketConnected(true);
      
      // Join user room for direct notifications
      console.log('Joining user room:', userId);
      socket.emit('joinUser', userId);
      
      // If we have a selected chat, join that room
      if (selectedChat) {
        console.log('Joining selected chat room:', selectedChat._id);
        socket.emit('joinChat', selectedChat._id);
      }
      
      // Fetch chats after connection is established
      fetchUserChats();
    });

    // On reconnect
    socket.on('reconnect', () => {
      console.log('Socket reconnected');
      setSocketConnected(true);
      
      // Rejoin user room
      console.log('Rejoining user room after reconnect:', userId);
      socket.emit('joinUser', userId);
      
      // If we have a selected chat, rejoin that room
      if (selectedChat) {
        console.log('Rejoining chat room after reconnect:', selectedChat._id);
        socket.emit('joinChat', selectedChat._id);
      }
      
      // Refresh data
      fetchUserChats();
      if (selectedChat) {
        fetchMessages(selectedChat._id);
      }
      
      // Show notification that we're back online
      addNotification('Connection restored');
    });

    // On disconnect
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
      
      // Show a notification that connection was lost
      addNotification('Connection lost. Trying to reconnect...');
    });

    // Real-time message from server
    socket.on('receiveMessage', wrapperIncomingMessage);

    // When a new chat is created
    socket.on('newChat', wrapperNewChat);

    // Listen for general notifications (not just chat)
    socket.on('newNotification', (notification) => {
      console.log('Received notification:', notification);
      
      // Add to custom notification system
      addNotification(notification.message);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted' && document.hidden) {
        const notif = new Notification(notification.message, {
          body: notification.type === 'chat_message' ? 'You have a new message' : notification.message,
          icon: '/logo.png'
        });
        
        notif.onclick = function() {
          window.focus();
          if (notification.link) {
            window.location.href = notification.link;
          }
        };
      }
      
      // Increment unread count
      setUnreadCount((prev) => prev + 1);
      
      // Play sound
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(e => console.log('Failed to play sound:', e));
      }
    });

    // Example custom event for new message notification
    socket.on('newMessageNotification', ({ chatId, chat, message }) => {
      console.log('Received message notification:', { chatId, chat, message });
      
      // Increment unread counter
      setUnreadCount((prev) => prev + 1);
      
      // Play notification sound
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(e => console.log('Failed to play sound:', e));
      }
      
      // Update chat list with the latest message
      setChatList((prev) => {
        const existingIndex = prev.findIndex((c) => c._id === chatId);
        if (existingIndex > -1) {
          // Chat exists - update it
          const updated = [...prev];
          updated[existingIndex] = { 
            ...updated[existingIndex], 
            ...chat,
            lastMessage: message
          };
          return updated.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
        } else {
          // This is a new chat - add it to the list immediately
          console.log('Adding new chat to list:', chat);
          
          // Make sure the chat object has all the data we need
          const newChat = {
            ...chat,
            _id: chatId,
            lastMessage: message,
            updatedAt: message.createdAt || new Date()
          };
          
          // Add notification for new chat/message
          addNotification(`New message from ${newChat.participants?.find(p => p._id !== userId)?.name || 'someone'}`);
          
          // Return updated list with the new chat
          return [newChat, ...prev].sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
        }
      });
    });

    // Add typing indicator handlers
    socket.on('userTyping', ({ chatId, userId: typingUserId, userName: typingUserName }) => {
      if (selectedChat?._id === chatId && typingUserId !== userId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(typingUserName);
          return newSet;
        });
      }
    });

    socket.on('userStoppedTyping', ({ chatId, userId: typingUserId, userName: typingUserName }) => {
      if (selectedChat?._id === chatId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(typingUserName);
          return newSet;
        });
      }
    });

    socket.on('messageError', ({ error }) => {
      console.error('Message error:', error);
      addNotification(`Error: ${error}`);
    });

    // Fetch the user's chats once socket is created
    fetchUserChats();

    // Cleanup
    return () => {
      console.log('Cleaning up socket connection');
      if (socket) {
        // Turn off all event listeners
        socket.offAny(logAllEvents);
        socket.off('connect');
        socket.off('disconnect');
        socket.off('reconnect');
        socket.off('receiveMessage', wrapperIncomingMessage);
        socket.off('newChat', wrapperNewChat);
        socket.off('newMessageNotification');
        socket.off('newNotification');
        socket.off('userTyping');
        socket.off('userStoppedTyping');
        socket.off('messageError');

        socket.disconnect();
        socket = null;
      }
    };
    
  }, [token, userId]);

  /**
   * Whenever selectedChat changes, fetch its messages and "join" that chat room.
   */
  useEffect(() => {
    if (selectedChat && socket) {
      console.log('Selected chat changed, fetching messages for:', selectedChat._id);
      fetchMessages(selectedChat._id);
      
      // Always explicitly join the chat room when selected chat changes
      if (socket.connected) {
        console.log('Joining chat room:', selectedChat._id);
        socket.emit('joinChat', selectedChat._id);
      } else {
        console.log('Socket not connected, cannot join chat room');
      }
    }
  }, [selectedChat?._id]);

  /**
   * Effect to handle open/close of the chat widget
   */
  useEffect(() => {
    if (open) {
      console.log('Chat widget opened, resetting unread count');
      setUnreadCount(0);
      
      // When opening the widget, also refetch chats to ensure we have the latest
      // We need to ensure the chat list isn't empty when reopening
      fetchUserChats();
    }
  }, [open]);
  
  /**
   * Ensure we have chats loaded even when widget is closed
   * This prevents the chat list from disappearing when widget is reopened
   */
  useEffect(() => {
    // If chat list is empty but we have a token, fetch chats
    if (token && chatList.length === 0) {
      console.log('Chat list is empty, fetching chats');
      fetchUserChats();
    }
  }, [token, chatList.length]);

  /**
   * Scroll to bottom whenever messages change.
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ----------------------------------------------------------------
  // Helper Functions
  // ----------------------------------------------------------------
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Function to add a notification
  const addNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // ----------------------------------------------------------------
  // API Calls
  // ----------------------------------------------------------------
  // Updated fetchUserChats function to handle missing user data on the client side

  const fetchUserChats = async () => {
    if (!token) {
      console.log('No token, skipping fetchUserChats');
      return;
    }
    
    // Prevent duplicate requests
    if (isLoading) {
      console.log('Already fetching chats, skipping duplicate request');
      return;
    }
    
    setIsLoading(true);
    console.log('Fetching user chats');
    
    try {
      const res = await axios.get(`${API_BASE_URL}api/chats/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Fetched chats:', res.data.length);
      
      // Create a set of all participant IDs who need names
      const unknownUserIds = new Set();
      
      // First pass: process chat data and identify missing participants
      const processedData = res.data.map(chat => {
        // Ensure participants are properly formatted
        if (chat.participants) {
          chat.participants = chat.participants.map(p => {
            // If participant is just an ID string, convert to object and flag for lookup
            if (typeof p === 'string') {
              unknownUserIds.add(p);
              return { _id: p };
            } 
            // If participant has _id but no name/email, flag for lookup
            else if (p._id && (!p.name || p.name.startsWith('User '))) {
              unknownUserIds.add(p._id.toString());
              return p;
            }
            return p;
          });
        }
        return chat;
      });
      
      // If we have unknown users, fetch their info
      if (unknownUserIds.size > 0) {
        console.log(`Need to fetch data for ${unknownUserIds.size} unknown users:`, Array.from(unknownUserIds));
        
        try {
          // Convert Set to array
          const userIdsArray = Array.from(unknownUserIds);
          
          // Fetch user data 
          const userRes = await axios.get(
            `${API_BASE_URL}api/users/batch?ids=${userIdsArray.join(',')}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          console.log('Fetched additional user data:', userRes.data);
          
          // Create a lookup map for the users we fetched
          const userDataMap = {};
          userRes.data.forEach(user => {
            userDataMap[user._id] = user;
          });
          
          // Second pass: update the processed data with the user info we fetched
          processedData.forEach(chat => {
            if (chat.participants) {
              chat.participants = chat.participants.map(p => {
                const id = p._id.toString();
                if (userDataMap[id]) {
                  return {
                    ...p,
                    name: userDataMap[id].name,
                    email: userDataMap[id].email
                  };
                }
                return p;
              });
            }
          });
        } catch (err) {
          console.error('Error fetching user data:', err);
          // Continue with what we have
        }
      }
      
      // Sort by updatedAt descending
      const sorted = (processedData || []).sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      
      // Only update if we have data to prevent wiping out existing chats
      if (sorted.length > 0) {
        setChatList(sorted);
      } else {
        console.log('No chats returned from API');
      }
    } catch (err) {
      console.error('Error fetching user chats:', err);
      addNotification('Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    if (!token) {
      console.log('No token, skipping fetchMessages');
      return;
    }
    
    console.log('Fetching messages for chat:', chatId);
    try {
      const res = await axios.get(`${API_BASE_URL}api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log(`Fetched ${res.data.length} messages for chat ${chatId}`);
      setMessages(res.data || []);
      
      // Ensure we're joined to the chat room
      if (socket && socket.connected) {
        console.log('Ensuring we are joined to chat room:', chatId);
        socket.emit('joinChat', chatId);
      }
      
      // Scroll to bottom after messages load
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error fetching messages:', err);
      addNotification('Failed to load messages');
    }
  };

  const handleSearch = async () => {
    if (!token || !searchQuery.trim()) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}api/users/search?q=${searchQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSearchResults(res.data || []);
    } catch (err) {
      console.error('Error searching for users:', err);
      addNotification('Failed to search for users');
    }
  };

  const handleStartChat = async (targetUserId) => {
    if (!token) return;
    console.log('Starting chat with user:', targetUserId);
    
    try {
      const res = await axios.post(
        `${API_BASE_URL}api/chats/init`,
        { targetUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const chat = res.data;
      console.log('Chat created/fetched:', chat);
      
      setChatList((prev) => {
        const existingIndex = prev.findIndex((c) => c._id === chat._id);
        if (existingIndex > -1) {
          // already in list, just update
          const updated = [...prev];
          updated[existingIndex] = chat;
          return updated.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
        }
        // new chat
        return [chat, ...prev].sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      });

      setSearchQuery('');
      setSearchResults([]);
      setSelectedChat(chat);
      setOpen(true);
    } catch (err) {
      console.error('Error starting/fetching chat:', err);
      addNotification('Failed to start chat');
    }
  };

  // Add typing indicator when user is typing
  const handleTyping = () => {
    if (!selectedChat || !socket) return;
    
    if (!isTyping) {
      setIsTyping(true);
      console.log('Sending typing indicator');
      socket.emit('typing', { 
        chatId: selectedChat._id,
        userId,
        userName
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      console.log('Sending stop typing indicator');
      socket.emit('stopTyping', { 
        chatId: selectedChat._id,
        userId,
        userName
      });
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!selectedChat || !socket || (!messageText.trim() && !fileAttachment)) return;
  
    try {
      const tempId = Date.now().toString();
      let fileData = null;
      
      // If there's a file, convert it to base64 with the filename
      if (fileAttachment) {
        fileData = await toBase64(fileAttachment);
      }
      
      const messageData = {
        _id: tempId,
        chatId: selectedChat._id,
        text: messageText,
        sender: userId,
        createdAt: new Date(),
        file: fileData
      };
  
      console.log('Sending message:', messageData);
  
      // Add optimistic update with temporary ID
      setMessages(prev => [...prev, messageData]);
  
      // Clear inputs immediately for better UX
      setMessageText('');
      setFileAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        socket.emit('stopTyping', { 
          chatId: selectedChat._id,
          userId,
          userName
        });
      }
  
      // Emit via Socket.IO
      socket.emit('sendMessage', messageData);
      
      // Listen for error and remove optimistic update if needed
      const errorHandler = ({ error }) => {
        console.error('Failed to send message:', error);
        setMessages(prev => prev.filter(msg => msg._id !== tempId));
        socket.off('messageError', errorHandler);
        
        // Show error notification
        addNotification(`Failed to send message: ${error}`);
      };
      
      socket.on('messageError', errorHandler);
      
      // Remove error handler after 5 seconds
      setTimeout(() => socket.off('messageError', errorHandler), 5000);
      
    } catch (err) {
      console.error('Error sending message:', err);
      addNotification('Failed to send message');
    }
  };

  // Add base64 conversion helper
  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Append the file name to the data URL
      const dataUrl = reader.result;
      const dataUrlWithFileName = `${dataUrl};name=${encodeURIComponent(file.name)}`;
      resolve(dataUrlWithFileName);
    };
    reader.onerror = error => reject(error);
  });

  const handleCloseChat = async (chatId) => {
    if (!token) return;
    try {
      await axios.delete(`${API_BASE_URL}api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChatList((prev) => prev.filter((c) => c._id !== chatId));
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error closing chat:', err);
      addNotification('Failed to close chat');
    }
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  // Update the drawer paper sx to make it wider
  const drawerPaperSx = {
    width: 850,  // Increased from 750 for an even wider chat panel
    height: '75vh', // Slightly taller too
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: '8px 8px 0 0',
    overflow: 'hidden',
  };

  // Request notification permissions when component mounts
  useEffect(() => {
    // Request browser notification permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Add this CSS to the component
  const notificationStyles = {
    container: {
      position: 'fixed',
      bottom: '80px',
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '300px',
    },
    notification: {
      backgroundColor: 'white',
      color: 'black',
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      animation: 'slideIn 0.3s ease-out',
      border: '1px solid #e0e0e0',
    }
  };

  const fetchUsersByIds = async (userIds) => {
    if (!userIds || userIds.length === 0 || !token) return {};
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}api/users/batch?ids=${userIds.join(',')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Create a map of user ID to user data
      const userMap = {};
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(user => {
          if (user && user._id) {
            userMap[user._id] = user;
          }
        });
      }
      
      return userMap;
    } catch (error) {
      console.error('Error fetching users by IDs:', error);
      return {};
    }
  };
  // Improve chat listing and display
  // Replace your existing renderChatList function in ChatWidget.jsx with this:

const renderChatList = () => {
  useEffect(() => {
    // This effect will run whenever chatList changes
    // It will identify and fetch any missing user information
    
    const missingUserIds = new Set();
    
    // Find participants that are just IDs or missing names
    chatList.forEach(chat => {
      if (chat.participants) {
        chat.participants.forEach(p => {
          // If it's a string ID or an object with ID but no name
          if (typeof p === 'string' || (p._id && !p.name)) {
            const id = typeof p === 'string' ? p : p._id.toString();
            missingUserIds.add(id);
          }
        });
      }
    });
    
    // If we have missing users, fetch their data
    if (missingUserIds.size > 0) {
      (async () => {
        const userMap = await fetchUsersByIds(Array.from(missingUserIds));
        
        // If we got user data, update the chat list
        if (Object.keys(userMap).length > 0) {
          setChatList(prevChats => {
            // Create a new array to avoid mutating state
            return prevChats.map(chat => {
              if (!chat.participants) return chat;
              
              // Create a new chat object with updated participants
              const updatedChat = { ...chat };
              updatedChat.participants = chat.participants.map(p => {
                const id = typeof p === 'string' ? p : p._id?.toString();
                
                // If this is a user we've fetched data for
                if (id && userMap[id]) {
                  return {
                    _id: id,
                    name: userMap[id].name,
                    email: userMap[id].email
                  };
                }
                
                // Otherwise return unchanged
                return p;
              });
              
              return updatedChat;
            });
          });
        }
      })();
    }
  }, [chatList]);

  if (isLoading && chatList.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">Loading chats...</Typography>
      </Box>
    );
  }
  
  if (!chatList || chatList.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">No chats yet</Typography>
      </Box>
    );
  }

  // Build a user lookup map for participants across all chats
  const userLookup = {};
  
  // Add current user to lookup
  if (userId && userName) {
    userLookup[userId] = { name: userName };
  }
  
  // First add all participants that have complete info
  chatList.forEach(chat => {
    if (chat.participants && Array.isArray(chat.participants)) {
      chat.participants.forEach(p => {
        if (p && typeof p === 'object' && p._id && p.name) {
          userLookup[p._id.toString()] = { 
            name: p.name,
            email: p.email
          };
        }
      });
    }
  });
  
  // Then check message senders as a backup source
  chatList.forEach(chat => {
    if (chat.lastMessage && chat.lastMessage.sender) {
      const sender = chat.lastMessage.sender;
      if (typeof sender === 'object' && sender._id && sender.name) {
        userLookup[sender._id.toString()] = {
          name: sender.name,
          email: sender.email
        };
      }
    }
  });
  
  console.log('User lookup table built:', userLookup);

  return (
    <List sx={{ width: '100%' }}>
      {chatList.map((chat) => {
        // Find the other participant (not the current user)
        let otherParticipant = null;
        
        if (chat.participants && Array.isArray(chat.participants)) {
          otherParticipant = chat.participants.find(p => {
            // Handle case where participant is just an ID string
            if (typeof p === 'string') {
              return p !== userId;
            }
            // Handle case where participant is an object with _id
            return p && p._id && p._id.toString() !== userId.toString();
          });
        }
        
        let otherParticipantName = 'Unknown User';
        let otherParticipantId = null;
        
        if (otherParticipant) {
          // Case 1: Participant is an object with name property
          if (typeof otherParticipant === 'object' && otherParticipant.name) {
            otherParticipantName = otherParticipant.name;
            otherParticipantId = otherParticipant._id.toString();
          }
          // Case 2: Participant is an object with _id but no name
          else if (typeof otherParticipant === 'object' && otherParticipant._id) {
            otherParticipantId = otherParticipant._id.toString();
            console.log(`Looking up participant ID in user lookup: ${otherParticipantId}`);
            
            // Check if this ID exists in our lookup table
            if (userLookup[otherParticipantId] && userLookup[otherParticipantId].name) {
              otherParticipantName = userLookup[otherParticipantId].name;
            } else {
              // If still not found, use a friendly fallback
              otherParticipantName = otherParticipant.email 
                ? otherParticipant.email.split('@')[0] 
                : `User ${otherParticipantId.substring(0, 6)}...`;
            }
          }
          // Case 3: Participant is just a string ID
          else if (typeof otherParticipant === 'string') {
            otherParticipantId = otherParticipant;
            console.log(`Looking up string participant ID: ${otherParticipantId}`);
            
            // Check if this ID exists in our lookup table
            if (userLookup[otherParticipantId] && userLookup[otherParticipantId].name) {
              otherParticipantName = userLookup[otherParticipantId].name;
            } else {
              // If still not found, use a friendly fallback
              otherParticipantName = `User ${otherParticipantId.substring(0, 6)}...`;
            }
          }
        }
        
        const isSelected = selectedChat && selectedChat._id === chat._id;
        
        // Get last message preview if available
        const lastMessageText = chat.lastMessage?.text || 'No messages yet';
        const lastMessageTime = chat.lastMessage?.createdAt || chat.updatedAt;
        
        // Use first character of name for avatar, default to '?' if unavailable
        const avatarText = otherParticipantName ? otherParticipantName.charAt(0).toUpperCase() : '?';
        
        return (
          <ListItem
            key={chat._id}
            button
            onClick={() => setSelectedChat(chat)}
            sx={{
              backgroundColor: isSelected ? '#e0f2f1' : 'inherit',
              borderLeft: isSelected ? '3px solid #009688' : 'none',
              pl: isSelected ? 1.7 : 2,
            }}
          >
            <ListItemAvatar>
              <Avatar>
                {avatarText}
              </Avatar>
            </ListItemAvatar>
            <ListItemText 
              primary={otherParticipantName}
              secondary={
                <Typography
                  variant="body2"
                  color="textSecondary"
                  noWrap
                  sx={{ maxWidth: '180px' }}
                >
                  {lastMessageText.length > 30 
                    ? `${lastMessageText.substring(0, 30)}...` 
                    : lastMessageText}
                </Typography>
              }
            />
            <Typography variant="caption" color="textSecondary">
              {lastMessageTime 
                ? new Date(lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                : ''}
            </Typography>
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseChat(chat._id);
                }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        );
      })}
    </List>
  );
};

  // Add a visual indicator for socket connection status
  const connectionStatus = () => {
    if (!token) return null;
    
    return (
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          display: 'flex', 
          alignItems: 'center',
          gap: 1
        }}
      >
        <Box 
          sx={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            backgroundColor: socketConnected ? 'green' : 'red' 
          }} 
        />
        <Typography variant="caption">
          {socketConnected ? 'Connected' : 'Disconnected'}
        </Typography>
      </Box>
    );
  };

  return (
    <>
      {/* Add audio element for notification sound */}
      <audio ref={soundRef} src="/notification.mp3" />
      
      {/* Custom Notifications */}
      <div style={notificationStyles.container}>
        {notifications.map(notification => (
          <div key={notification.id} style={notificationStyles.notification}>
            {notification.message}
          </div>
        ))}
      </div>

      {/* Floating Action Button to open the chat */}
      {!open && (
        <Tooltip title="Open Chat">
          <Badge badgeContent={unreadCount} color="error" overlap="circular">
            <Fab
              color="primary"
              onClick={() => {
                setOpen(true);
                setUnreadCount(0); // If you want to reset unread
                // Refetch chats when opening to ensure we have the latest
                fetchUserChats();
              }}
              sx={{ position: 'fixed', bottom: 16, right: 16 }}
            >
              <GroupIcon />
            </Fab>
          </Badge>
        </Tooltip>
      )}

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: drawerPaperSx }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', position: 'relative' }}>
            <Typography variant="h6">Chat</Typography>
            {connectionStatus()}
            <IconButton
              onClick={() => setOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', height: 'calc(100% - 60px)', overflow: 'hidden' }}>
            {/* Left panel: chat list and search */}
            <Box 
              sx={{ 
                width: '300px',  // Increased from 230px for wider left panel
                borderRight: '1px solid #e0e0e0',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
            >
              {/* Search bar */}
              <Box sx={{ p: 1, borderBottom: '1px solid #e0e0e0' }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={handleSearch}
                          size="small"
                        >
                          <SearchIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Search results */}
              {searchResults.length > 0 && (
                <Box sx={{ p: 1, borderBottom: '1px solid #e0e0e0' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Search Results
                  </Typography>
                  <List dense>
                    {searchResults.map((user) => (
                      <ListItem
                        key={user._id}
                        button
                        onClick={() => handleStartChat(user._id)}
                      >
                        <ListItemAvatar>
                          <Avatar>{user.name.charAt(0).toUpperCase()}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={user.name}
                          secondary={user.email}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Chat list */}
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {renderChatList()}
              </Box>
            </Box>

            {/* Right panel: messages */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: '#fafafa',
                width: 'calc(100% - 300px)',  // Adjusted for wider left panel
              }}
            >
              {selectedChat ? (
                <>
                  {/* Chat header */}
                  <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: 'white' }}>
                    <Typography variant="subtitle1">
                      {selectedChat.participants?.find(p => p._id !== userId)?.name || 'Chat'}
                    </Typography>
                  </Box>
                  
                  {/* Messages area */}
                  <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
  {messages.map((msg) => {
    const senderId = msg.sender?._id || msg.sender;
    const isMine = senderId === userId;
    
    // Check if the file is an image by examining the data URL
    const isImageFile = msg.file && msg.file.startsWith('data:image/');
    
    // Extract file name if present in the data URL
    let fileName = "File";
    if (msg.file && msg.file.includes(';name=')) {
      const nameMatch = msg.file.match(/;name=([^;]+)/);
      fileName = nameMatch ? nameMatch[1] : "File";
    }
    
    return (
      <Box
        key={msg._id || Math.random()}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMine ? 'flex-end' : 'flex-start',
          mb: 1,
        }}
      >
        <Box
          sx={{
            maxWidth: '70%',
            p: 1,
            borderRadius: 1,
            backgroundColor: isMine ? '#e3f2fd' : 'white',
            boxShadow: 1,
          }}
        >
          <Typography variant="body2">{msg.text}</Typography>
          
          {/* File attachment rendering */}
          {msg.file && (
            <Box 
              sx={{ 
                mt: 1, 
                border: '1px solid #e0e0e0', 
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: '#f5f5f5'
              }}
            >
              {isImageFile ? (
                // If it's an image, show a preview
                <Box sx={{ position: 'relative' }}>
                  <img 
                    src={msg.file} 
                    alt="Attachment" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px',
                      display: 'block'
                    }} 
                  />
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      right: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      padding: '4px 8px'
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ color: 'white', display: 'flex', alignItems: 'center' }}
                    >
                      <AttachFileIcon fontSize="small" sx={{ mr: 0.5 }} />
                      {fileName}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                // If it's not an image, show a download link with icon
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px',
                    '&:hover': {
                      backgroundColor: '#eeeeee'
                    }
                  }}
                >
                  <AttachFileIcon fontSize="small" sx={{ mr: 1 }} />
                  <a
                    href={msg.file}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      textDecoration: 'none', 
                      color: '#1976d2',
                      fontSize: '0.875rem',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '200px'
                    }}
                  >
                    {fileName}
                  </a>
                </Box>
              )}
            </Box>
          )}
          
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
          >
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </Box>
      </Box>
    );
  })}
  <div ref={messagesEndRef} />
</Box>

                  {/* Typing indicators */}
                  {typingUsers.size > 0 && (
                    <Typography variant="caption" sx={{ p: 1, color: 'text.secondary' }}>
                      {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </Typography>
                  )}

                  {/* Message input */}
                  <Box
  sx={{
    p: 1,
    borderTop: '1px solid #e0e0e0',
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
  }}
>
  {/* File preview if selected but not yet sent */}
  {fileAttachment && (
    <Box 
      sx={{ 
        mb: 1, 
        p: 1, 
        backgroundColor: '#f5f5f5',
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #e0e0e0',
      }}
    >
      <AttachFileIcon fontSize="small" sx={{ mr: 1 }} />
      <Typography variant="caption" sx={{ flex: 1 }}>
        {fileAttachment.name}
      </Typography>
      <IconButton 
        size="small" 
        onClick={(e) => {
          e.stopPropagation();
          // Clear both the DOM input and our state
          if (fileInputRef.current) fileInputRef.current.value = '';
          setFileAttachment(null);
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  )}
  
  {/* Message input with file and send buttons */}
  <Box sx={{ display: 'flex' }}>
    <TextField
      multiline
      maxRows={3}
      size="small"
      fullWidth
      variant="outlined"
      placeholder="Type your message..."
      value={messageText}
      onChange={(e) => {
        setMessageText(e.target.value);
        handleTyping();
      }}
      onKeyDown={(e) => {
        // Send on Enter without Shift
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      }}
    />
    <IconButton
      color="primary"
      onClick={handleSendMessage}
      disabled={!messageText.trim() && !fileAttachment}
      sx={{ ml: 1 }}
    >
      <SendIcon />
    </IconButton>
    <input
      type="file"
      ref={fileInputRef}
      style={{ display: 'none' }}
      onChange={(e) => {
        // When a file is selected, update our state
        if (e.target.files && e.target.files[0]) {
          setFileAttachment(e.target.files[0]);
        } else {
          setFileAttachment(null);
        }
      }}
    />
    <IconButton
      onClick={() => fileInputRef.current?.click()}
      sx={{ ml: 1 }}
    >
      <AttachFileIcon />
    </IconButton>
  </Box>
</Box>
                </>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <Typography variant="h6" color="textSecondary">
                    Select a chat or start a new one
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default ChatWidget;