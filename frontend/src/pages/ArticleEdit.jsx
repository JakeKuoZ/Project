import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Paper, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
// Assuming you're using a rich text editor like React Quill
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ArticleEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get user data directly from localStorage
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    // If not admin, redirect away
    if (!isAdmin) {
      navigate('/articles');
      return;
    }
    
    const fetchArticle = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}api/articles/${id}`);
        const article = response.data;
        
        setTitle(article.title);
        setContent(article.content);
        setFiles(article.files || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch article');
        setLoading(false);
      }
    };
    
    fetchArticle();
  }, [id, navigate, isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      
      // Create form data for file uploads
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      
      // Add new files to form data
      if (newFiles.length > 0) {
        for (let i = 0; i < newFiles.length; i++) {
          formData.append('files', newFiles[i]);
        }
      }

      await axios.put(`${API_BASE_URL}api/articles/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setSuccess('Article updated successfully');
      setSubmitting(false);
      
      // Navigate back to article detail after a short delay
      setTimeout(() => {
        navigate(`/articles/${id}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update article');
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    setNewFiles(e.target.files);
  };

  // Construct the full file URL from the filename
  const getFileUrl = (filename) => 
    `${API_BASE_URL}uploads/${encodeURIComponent(filename)}`;

  return (
    <Box sx={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <Typography variant="h4" gutterBottom>
        Edit Article
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <TextField
            label="Title"
            required
            fullWidth
            margin="normal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Typography variant="h6" gutterBottom>
            Content
          </Typography>
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
            style={{ height: '300px', marginBottom: '50px' }}
          />

          <Box sx={{ mt: 6, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Files
            </Typography>
            
            {files.length > 0 ? (
              <Paper elevation={2} sx={{ mb: 2 }}>
                <List>
                  {files.map((file, index) => (
                    <ListItem
                      key={index}
                      secondaryAction={
                        <IconButton edge="end" aria-label="delete" disabled>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText 
                        primary={file} 
                        secondary={
                          <Button 
                            size="small" 
                            href={getFileUrl(file)} 
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View file
                          </Button>
                        } 
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No files attached
              </Typography>
            )}
            
            <Typography sx={{ mt: 3 }}>
              Upload New Files (Will replace existing files)
            </Typography>
            <input
              accept="*/*"
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ marginTop: '8px', marginBottom: '16px' }}
            />
            <Typography variant="caption" display="block" color="text.secondary">
              Max 5 files, 10MB each
            </Typography>
          </Box>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/articles/${id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'Update Article'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ArticleEdit;