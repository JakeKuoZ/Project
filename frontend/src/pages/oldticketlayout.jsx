// TicketCreate.jsx
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  CircularProgress,
  Alert,
  Stack
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const TicketCreate = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('htmlDescription', description);
      formData.append('priority', priority);
      files.forEach(file => formData.append('files', file));

      await axios.post('http://localhost:5000/api/tickets', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      navigate('/tickets', { state: { refresh: true } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>Create New Ticket</Typography>
      
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(e.target.value)}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ height: 250 }}>
            <Typography variant="subtitle1" gutterBottom>
              Description
            </Typography>
            <ReactQuill
              value={description}
              onChange={setDescription}
              theme="snow"
              style={{ height: 200 }}
            />
          </Box>

          <Button
            variant="contained"
            component="label"
          >
            Upload Files
            <input
              type="file"
              multiple
              hidden
              onChange={(e) => setFiles([...files, ...e.target.files])}
            />
          </Button>

          {files.length > 0 && (
            <Typography variant="body2">
              Files: {files.map(file => file.name).join(', ')}
            </Typography>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Ticket'}
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

export default TicketCreate;