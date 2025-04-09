import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Dialog, 
         DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import API_BASE_URL from '../config';

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Get user data directly from localStorage
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}api/articles/${id}`);
        setArticle(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch article');
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  // Helper to check if file extension is image
  const isImageFile = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
  };

  // Construct the full file URL from the filename
  const getFileUrl = (filename) => 
    `${API_BASE_URL}uploads/${encodeURIComponent(filename)}`;

  // Handle Delete Article
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}api/articles/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setDeleteDialogOpen(false);
      // Redirect to articles list after successful deletion
      navigate('/articles');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete article');
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  // Handle Edit Article
  const handleEditClick = () => {
    navigate(`/articles/edit/${id}`);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && article && (
        <Box>
          {/* Admin Actions - Only show if user is admin */}
          {isAdmin && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleEditClick}
              >
                Edit Article
              </Button>
              <Button 
                variant="contained" 
                color="error" 
                onClick={handleDeleteClick}
              >
                Delete Article
              </Button>
            </Box>
          )}

          {/* Title */}
          <Typography variant="h3" gutterBottom>
            {article.title}
          </Typography>

          {/* Rich Text Content (Assuming article.content is HTML) */}
          <Box
            sx={{ marginBottom: '16px' }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(article.content),
            }}
          />

          {/* Files Section */}
          {article.files && article.files.length > 0 && (
            <Box sx={{ marginTop: '24px' }}>
              <Typography variant="h5" gutterBottom>
                Attachments
              </Typography>
              {article.files.map((file, index) => {
                const fileUrl = getFileUrl(file);
                const image = isImageFile(file);

                return (
                  <Box key={index} sx={{ marginBottom: '16px' }}>
                    {image ? (
                      // Display image
                      <img
                        src={fileUrl}
                        alt={file}
                        style={{ maxWidth: '100%', height: 'auto' }}
                      />
                    ) : (
                      // Provide a download link for non-images
                      <Button
                        variant="outlined"
                        component="a"
                        href={fileUrl}
                        download // Triggers file download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download {file}
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={handleDeleteCancel}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">
              {"Confirm Article Deletion"}
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                Are you sure you want to delete this article? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDeleteCancel} color="primary">
                Cancel
              </Button>
              <Button onClick={handleDeleteConfirm} color="error" autoFocus>
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

export default ArticleDetail;