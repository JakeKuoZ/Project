import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Alert, 
  CircularProgress 
} from '@mui/material';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import API_BASE_URL from '../config';

const CreateArticle = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // New state to track if the form is valid
  const [isFormValid, setIsFormValid] = useState(true);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    let formIsStillValid = true;

    selectedFiles.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        // Exceeds 10MB
        setError(`File ${file.name} exceeds 10MB limit`);
        formIsStillValid = false;
      }
    });

    // If one file fails, we do not add any of them
    if (!formIsStillValid) {
      setIsFormValid(false);
      return;
    }
    
    // If everything is okay, add them
    setError('');
    setIsFormValid(true);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

     // Additional front-end check
     if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      setIsFormValid(false);
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      const sanitizedContent = DOMPurify.sanitize(content);

      // Validate required fields
      if (!title.trim() || !sanitizedContent.trim()) {
        throw new Error('Title and content are required');
      }

      formData.append('title', title);
      formData.append('content', sanitizedContent);
      files.forEach(file => formData.append('files', file));

      const response = await axios.post(`${API_BASE_URL}api/articles`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        setSuccess('Article created successfully!');
        // Reset form without reloading
        setTitle('');
        setContent('');
        setFiles([]);
      }
    } catch (err) {
      if (err.response?.status === 413) {
        setError('File size exceeds maximum allowed limit (10MB per file)');
      } else {
        // existing error handling
      }
      const errorMessage = err.response?.data?.error || 
                         err.message || 
                         'Failed to create article';
      setError(errorMessage);
      console.error('Submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" sx={{ p: 2 }}>
      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{
          maxWidth: '800px',
          width: '100%',
          p: 3,
          boxShadow: 3,
          borderRadius: 2,
          backgroundColor: '#ffffff'
        }}
      >
        <Typography variant="h4" gutterBottom>
          Create Article
        </Typography>

        {/* Success/Error Alerts */}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Title Input */}
        <Typography variant="h6" gutterBottom>Title</Typography>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ 
            width: '100%', 
            padding: '8px', 
            marginBottom: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />

        {/* Content Editor */}
        <Typography variant="h6" gutterBottom>Content</Typography>
        <Box sx={{ mb: 3 }}>
          <ReactQuill
            value={content}
            onChange={setContent}
            theme="snow"
            style={{ 
              minHeight: 150, 
              maxHeight: 300, 
              overflow: 'auto',
              backgroundColor: 'white'
            }}
          />
        </Box>

        {/* File Upload Section */}
        <Box sx={{ mb: 2 }}>
          <Button variant="contained" component="label">
            Upload Files
            <input
              type="file"
              multiple
              hidden
              onChange={handleFileChange}
              //accept="image/*, .pdf, .doc, .docx"
              data-max-size="10485760" // 10MB in bytes
            />
          </Button>

          {files.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Selected Files:</Typography>
              {files.map((file, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mt: 1 
                  }}
                >
                  <Typography variant="body2">{file.name}</Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            'Create Article'
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default CreateArticle;