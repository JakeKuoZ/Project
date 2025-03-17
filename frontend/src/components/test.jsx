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

  // REFS
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const soundRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  
  // Use refs to store handler functions to avoid recreating them on every render
  const handleIncomingMessageRef = useRef(null);
  const handleNewChatRef = useRef(null);

  // Retrieve user info from localStorage
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');

  // Define handler functions as useCallback to maintain referential stability
  const handleIncomingMessage = useCallback((data) => {
    console.log('Received message event:', data);
    console.log('Current selectedChat:', selectedChat?._id);
    console.log('Incoming message chatId:', data.chatId);
    
    // If this is for the currently selected chat, add the message to the messages array
    if (selectedChat && data.chatId === selectedChat._id) {
      console.log('Message is for selected chat - adding to messages');
      
      setMessages(prev => {
        // Check if we already have this exact message by ID
        if (prev.some(msg => msg._id === data._id)) {
          console.log('Exact message ID already exists, not adding duplicate');
          return prev;
        }
        
        // Then check if we have a temp version of this message
        // (matching on content and approximate time)
        const tempIndex = prev.findIndex(msg => 
          msg.text === data.text && 
          String(msg.sender).includes(String(data.sender?._id || data.sender)) &&
          Math.abs(new Date(msg.createdAt) - new Date(data.createdAt)) < 10000
        );
        
        if (tempIndex >= 0) {
          console.log('Found temporary version of this message, replacing');
          const updatedMessages = [...prev];
          updatedMessages[tempIndex] = data;
          return updatedMessages;
        }
        
        // Otherwise add as new message
        console.log('Adding new message to UI');
        return [...prev, data];
      });
      
      // Scroll to bottom after state update
      setTimeout(scrollToBottom, 50);
    } else {
      console.log('Message is NOT for selected chat');
      // Some other chat - increment unread count
      setUnreadCount(prev => prev + 1);
      
      // Play notification sound
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(e => console.log('Failed to play sound:', e));
      }
    }

    // Always update the chat list to keep it current regardless of which chat received the message
    setChatList(prev => {
      const chatIndex = prev.findIndex(chat => chat._id === data.chatId);
      
      if (chatIndex >= 0) {
        // Update existing chat with latest message info
        const updatedChats = [...prev];
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          updatedAt: data.createdAt || new Date(),
          lastMessage: data
        };
        
        // Re-sort by most recent
        return updatedChats.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      } else {
        // This should rarely happen - a new message for a chat not in our list
        // In this case, we should refetch all chats
        console.log('Chat not found in list, refreshing chats');
        fetchUserChats();
        return prev;
      }
    });
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
      
      // Process participant data to ensure correct format
      const processedData = res.data.map(chat => {
        // Ensure participants are properly formatted
        if (chat.participants) {
          chat.participants = chat.participants.map(p => {
            // If participant is just an ID string, convert to object
            if (typeof p === 'string' || p instanceof String || !p._id) {
              return { _id: p.toString() };
            }
            return p;
          });
        }
        return chat;
      });
      
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
    if (!selectedChat || !socket || !messageText.trim()) return;
  
    try {
      const tempId = Date.now().toString();
      
      // Create message data without file initially
      const messageData = {
        _id: tempId,
        chatId: selectedChat._id,
        text: messageText,
        sender: userId,
        createdAt: new Date(),
      };
  
      console.log('Sending message:', messageData);
  
      // Add optimistic update with temporary ID
      setMessages(prev => [...prev, messageData]);
  
      // Clear message text immediately for better UX
      setMessageText('');
  
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        socket.emit('stopTyping', { 
          chatId: selectedChat._id,
          userId,
          userName
        });
      }
  
      // Handle file upload differently based on if there's a file
      if (fileInputRef.current?.files[0]) {
        // For file uploads, use FormData and axios to send via REST API
        const formData = new FormData();
        formData.append('chatId', selectedChat._id);
        formData.append('text', messageData.text);
        formData.append('file', fileInputRef.current.files[0]);
        
        // Clear file input immediately for better UX
        fileInputRef.current.value = '';
        
        // Send using REST API for file uploads
        try {
          const response = await axios.post(
            `${API_BASE_URL}api/chats/`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          // Remove optimistic message and add the real one
          setMessages(prev => prev.filter(msg => msg._id !== tempId));
          
          // Populate the response (backend should return populated message)
          if (response.data) {
            setMessages(prev => [...prev, response.data]);
          }
        } catch (error) {
          console.error('Error sending file message:', error);
          // Remove optimistic message if it failed
          setMessages(prev => prev.filter(msg => msg._id !== tempId));
          addNotification('Failed to upload file');
        }
      } else {
        // For text-only messages, continue using Socket.IO
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
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      addNotification('Failed to send message');
    }
  };

  // Add base64 conversion helper
  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
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

  // Improve chat listing and display
  const renderChatList = () => {
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

    return (
      <List sx={{ width: '100%' }}>
        {chatList.map((chat) => {
          // Find the other participant (not current user)
          // Fixed logic to correctly identify the other participant
          const otherParticipant = chat.participants?.find(
            (p) => {
              // Handle both object and string IDs
              const participantId = p?._id || p;
              return participantId.toString() !== userId.toString();
            }
          );
          
          // Keep a reference to participants even if they're just IDs
          const otherParticipantName = 
            otherParticipant?.name || 
            (chat.participantNames ? chat.participantNames.find(name => name !== userName) : null) || 
            'Unknown User';
          
          const isSelected = selectedChat && selectedChat._id === chat._id;
          
          // Get last message preview if available
          const lastMessageText = chat.lastMessage?.text || 'No messages yet';
          const lastMessageTime = chat.lastMessage?.createdAt || chat.updatedAt;
          
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
                  {otherParticipantName.charAt(0).toUpperCase()}
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
                            {msg.file && (
                              <Box sx={{ mt: 1 }}>
                                <a
                                  href={msg.file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Attachment
                                </a>
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
                    }}
                  >
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
                      disabled={!messageText.trim()}
                      sx={{ ml: 1 }}
                    >
                      <SendIcon />
                    </IconButton>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                    />
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ ml: 1 }}
                    >
                      <AttachFileIcon />
                    </IconButton>
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