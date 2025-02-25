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
import API_BASE_URL from '../config';

const TicketCreate = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Tracks if the form is valid (no file errors, etc.)
  const [isFormValid, setIsFormValid] = useState(true);

  const navigate = useNavigate();

  // Validate file sizes (10MB max) and set error if any is too large
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    let valid = true;
    selectedFiles.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} exceeds 10MB limit`);
        valid = false;
      }
    });

    // If invalid, don't add them and disable the form
    if (!valid) {
      setIsFormValid(false);
      return;
    }

    // If valid, clear error and add them to 'files'
    setError('');
    setIsFormValid(true);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  // Remove a file from the selected list
  const handleRemoveFile = (index) => {
    const updated = [...files];
    updated.splice(index, 1);
    setFiles(updated);

    // If removing a file was the only error, clear it
    setError('');
    setIsFormValid(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('htmlDescription', description);
      formData.append('priority', priority);
      files.forEach((file) => formData.append('files', file));

      await axios.post(`${API_BASE_URL}api/tickets`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
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
      <Typography variant="h4" gutterBottom>
        Create New Ticket
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Title */}
          <TextField
            label="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsFormValid(true);
            }}
            fullWidth
            required
          />

          {/* Priority */}
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

          {/* Description (Rich Text Editor) */}
          <Box sx={{ minHeight: 250 }}>
            <Typography variant="subtitle1" gutterBottom>
              Description
            </Typography>
            <ReactQuill
              value={description}
              onChange={(val) => {
                setDescription(val);
                setIsFormValid(true);
              }}
              theme="snow"
              style={{ minHeight: 200 }}
            />
          </Box>

          {/* File Upload */}
          <Button variant="contained" component="label">
            Upload Files
            <input
              type="file"
              multiple
              hidden
              onChange={handleFileChange}
            />
          </Button>

          {/* List chosen files + "Remove" button */}
          {files.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Selected Files:</Typography>
              {files.map((file, index) => (
                <Stack key={index} direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2">{file.name}</Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleRemoveFile(index)}
                  >
                    Remove
                  </Button>
                </Stack>
              ))}
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {/* Submit Button - disable if invalid or loading */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !isFormValid}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Ticket'}
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

export default TicketCreate;
