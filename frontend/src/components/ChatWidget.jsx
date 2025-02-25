// ChatWidget.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Fab,
  Drawer,
  Paper,
  IconButton,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Toolbar,
  AppBar,
  InputAdornment,
  Tooltip,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import GroupIcon from '@mui/icons-material/Group';
import io from 'socket.io-client';
import axios from 'axios';
import API_BASE_URL from '../config';


// Adjust this to wherever your backend + socket server is running
const SOCKET_URL = 'http://192.168.86.34:5000';
// If you have a config file, import it or define your base URL similarly
// e.g. import API_BASE_URL from '../config'; 
// For demonstration:
//const API_BASE_URL = 'http://192.168.86.34:5000/api/';

let socket = null;

const ChatWidget = () => {
  const [open, setOpen] = useState(false);             // Is the chat drawer open
  const [chatList, setChatList] = useState([]);        // List of chat objects
  const [selectedChat, setSelectedChat] = useState(null); // The currently selected chat
  const [messages, setMessages] = useState([]);        // Messages for selected chat
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [messageText, setMessageText] = useState('');
  const fileInputRef = useRef(null);

  // Initialize socket once user has a token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !socket) {
      socket = io(SOCKET_URL, {
        auth: { token },
        path: '/socket.io'
      });

      // Listen for incoming messages
      socket.on('receiveMessage', (data) => {
        // If the message belongs to the currently opened chat, append it
        if (data.chatId === selectedChat?._id) {
          setMessages((prev) => [...prev, data]);
        }
      });
    }

    return () => {
      // Disconnect socket on cleanup, if desired
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [selectedChat]);

  // Load messages whenever selectedChat changes
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
      // Join the socket room
      socket?.emit('joinChat', selectedChat._id);
    }
  }, [selectedChat]);

  /**
   * Fetch messages for a given chatId
   */
  const fetchMessages = async (chatId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API_BASE_URL}api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data || []);
    } catch (err) {
      console.error('Error fetching messages', err);
    }
  };

  /**
   * Search for users by name
   */
  const handleSearch = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !searchQuery.trim()) return;

      const res = await axios.get(`${API_BASE_URL}api/users/search?q=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(res.data);
    } catch (err) {
      console.error('Error searching for users', err);
    }
  };

  /**
   * Create or fetch an existing chat with the target user
   */
  const handleStartChat = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.post(
        `${API_BASE_URL}api/chats/init`,
        { targetUserId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const chat = res.data;
      // Add to chatList if not already present
      setChatList((prev) => {
        const existing = prev.find((c) => c._id === chat._id);
        if (existing) return prev;
        return [...prev, chat];
      });

      // Clear search UI
      setSearchQuery('');
      setSearchResults([]);
      // Select the chat
      setSelectedChat(chat);
      setOpen(true);
    } catch (err) {
      console.error('Error starting/fetching chat', err);
    }
  };

  /**
   * Send a message
   */
  const handleSendMessage = async () => {
    try {
      if (!selectedChat) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      const formData = new FormData();
      formData.append('chatId', selectedChat._id);
      formData.append('text', messageText);
      if (fileInputRef.current?.files[0]) {
        formData.append('file', fileInputRef.current.files[0]);
      }

      // Call backend
      const res = await axios.post(`${API_BASE_URL}api/chats`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const newMsg = res.data;
      // Clear input
      setMessageText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Emit real-time
      socket?.emit('sendMessage', {
        chatId: selectedChat._id,
        text: newMsg.text,
        sender: newMsg.sender,
        file: newMsg.file,
      });

      // Also update local state
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  /**
   * Close (delete) a chat
   */
  const handleCloseChat = async (chatId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(`${API_BASE_URL}api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setChatList((prev) => prev.filter((c) => c._id !== chatId));
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error closing chat', err);
    }
  };

  // MUI inline styles for a Drawer anchored to the right/bottom
  const drawerPaperSx = {
    width: 400,
    height: 500,
    position: 'absolute',
    bottom: 0,
    right: 0,
    // The following style helps place the Drawer as a "floating" panel:
    borderRadius: '8px 8px 0 0',
    overflow: 'hidden',
  };

  /**
   * RENDER
   */
  return (
    <>
      {/* Floating FAB to open chat */}
      {!open && (
        <Tooltip title="Open Chat">
          <Fab
            color="primary"
            onClick={() => setOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
          >
            <GroupIcon />
          </Fab>
        </Tooltip>
      )}

      {/* Drawer: anchored in bottom-right (by using anchor="bottom") */}
      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        variant="temporary"
        PaperProps={{
          sx: drawerPaperSx,
        }}
      >
        {/* Header */}
        <AppBar position="relative" sx={{ p: 1, flexShrink: 0 }}>
          <Toolbar
            variant="dense"
            sx={{ display: 'flex', justifyContent: 'space-between' }}
          >
            <Typography variant="h6" noWrap component="div">
              Chat
            </Typography>

            <Box>
              <IconButton
                onClick={() => setOpen(false)}
                sx={{ color: 'white', mr: 1 }}
              >
                <MinimizeIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Body (two-panel layout) */}
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Left Panel */}
          <Paper
            elevation={1}
            sx={{
              width: '40%',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid #ccc',
            }}
          >
            {/* Search bar */}
            <Box sx={{ p: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                label="Search user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSearch}>
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Search results */}
            {searchResults.length > 0 && (
              <List dense sx={{ maxHeight: 100, overflow: 'auto' }}>
                {searchResults.map((user) => (
                  <ListItem
                    key={user._id}
                    button
                    onClick={() => handleStartChat(user._id)}
                  >
                    <ListItemText
                      primary={user.name}
                      secondary={user.email}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            <Divider />

            {/* List of open chats */}
            <List dense sx={{ flex: 1, overflow: 'auto' }}>
              {chatList.map((chat) => {
                // Assuming only 2 participants for simplicity
                const other = chat.participants?.find(
                  (p) => p._id !== localStorage.getItem('userId')
                );
                return (
                  <ListItem
                    key={chat._id}
                    button
                    selected={selectedChat?._id === chat._id}
                    onClick={() => setSelectedChat(chat)}
                    sx={{
                      backgroundColor:
                        selectedChat?._id === chat._id ? '#e0f2f1' : 'inherit',
                    }}
                  >
                    <ListItemText
                      primary={other?.name || 'Unknown User'}
                      secondary={other?.email || ''}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleCloseChat(chat._id)}
                      >
                        <CloseIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </Paper>

          {/* Right Panel: messages + input */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#fafafa',
            }}
          >
            {selectedChat ? (
              <>
                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {messages.map((msg) => {
                    const isMine =
                      msg.sender?._id === localStorage.getItem('userId');
                    return (
                      <Box
                        key={msg._id}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Paper
                          sx={{
                            p: 1,
                            maxWidth: '70%',
                            bgcolor: isMine ? 'primary.light' : 'grey.200',
                          }}
                        >
                          {/* If there's a file attachment */}
                          {msg.file && (
                            <Box sx={{ mb: 1 }}>
                              <a
                                href={`${API_BASE_URL}uploads/${encodeURIComponent(
                                  msg.file
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Download File
                              </a>
                            </Box>
                          )}

                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {msg.text}
                          </Typography>
                        </Paper>
                      </Box>
                    );
                  })}
                </Box>

                {/* Message input area */}
                <Box
                  sx={{
                    borderTop: '1px solid #ccc',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
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
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <Button variant="outlined" component="label">
                    File
                    <input
                      type="file"
                      hidden
                      ref={fileInputRef}
                    />
                  </Button>
                  <IconButton color="primary" onClick={handleSendMessage}>
                    <SendIcon />
                  </IconButton>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 2,
                }}
              >
                <Typography variant="body1">
                  Select or start a chat from the left panel.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default ChatWidget;
