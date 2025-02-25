// ArticleList.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Pagination } from '@mui/material';
import axios from 'axios';
import DOMPurify from 'dompurify'; // For safely rendering HTML

// Helper to strip text from Quill HTML
const extractText = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Helper to detect if a filename is an image by its extension
const isImageFile = (filename) => {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(filename);
};

const ArticleList = () => {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 5; // Fixed 5 articles per page

  useEffect(() => {
    fetchArticles();
  }, [page]); // Fetch when page changes

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `http://localhost:5000/api/articles?page=${page}&limit=${limit}`
      );
      
      setArticles(res.data.articles);
      setTotalPages(Math.ceil(res.data.total / limit));
      setError('');
    } catch (err) {
      setError('Failed to fetch articles');
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Add error boundary and loading state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchArticles} sx={{ mt: 2 }}>Retry</Button>
      </Box>
    );
  }

  if (!articles.length && !totalPages) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>No articles found</Typography>
      </Box>
    );
  }

  // Render each article card
  const renderArticle = (article) => {
    // #1. Find the FIRST image in article.files (if any)
    const firstImageFile = article.files.find(isImageFile);
    // #2. The rest of the files
    const otherFiles = article.files.filter((f) => f !== firstImageFile);

    return (
      <Box
        key={article._id}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px',
          padding: '16px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          flexDirection: 'column',
        }}
      >
        {/* Display the first image as a thumbnail */}
        {firstImageFile && (
          <Box
            component="img"
            src={`http://localhost:5000/uploads/${firstImageFile}`}
            alt="Article Cover"
            sx={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              marginBottom: '16px',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Title */}
        <Typography variant="h5" gutterBottom>
          {article.title}
        </Typography>

        {/* Sanitized Quill HTML */}
        <Typography
          variant="body1"
          sx={{ marginBottom: '16px' }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(article.content),
          }}
        />

        {/* Short excerpt (plain text) */}
        <Typography variant="body2" sx={{ color: 'gray', marginBottom: '16px' }}>
          {extractText(article.content).substring(0, 200)}...
        </Typography>

        {/* Attachments (other files below) */}
        {otherFiles.length > 0 && (
          <Box sx={{ marginTop: '8px' }}>
            <Typography variant="subtitle1" gutterBottom>
              Attachments
            </Typography>
            {otherFiles.map((file, index) => {
              const fileUrl = `http://localhost:5000/uploads/${file}`;
              if (isImageFile(file)) {
                // Show smaller images or a second image
                return (
                  <Box
                    key={index}
                    component="img"
                    src={fileUrl}
                    alt={file}
                    sx={{
                      width: '100%',
                      maxHeight: '200px',
                      marginBottom: '8px',
                      objectFit: 'cover',
                    }}
                  />
                );
              } else {
                // Non-image file => show link
                return (
                  <Typography
                    key={index}
                    variant="body2"
                    sx={{
                      marginBottom: '8px',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: '#f5f5f5',
                    }}
                  >
                    File: 
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginLeft: 4 }}
                    >
                      {file}
                    </a>
                  </Typography>
                );
              }
            })}
          </Box>
        )}

        {/* "Read More" button to detail page */}
        <Button
          variant="outlined"
          href={`/articles/${article._id}`}
          sx={{ textTransform: 'none', marginTop: '16px' }}
        >
          Read More
        </Button>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      minHeight: '100vh',
      p: 3 
    }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Articles
      </Typography>

      {loading && <CircularProgress />}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <Box sx={{ 
            width: '100%', 
            maxWidth: '800px', 
            mb: 4 
          }}>
            {articles.map(renderArticle)}
          </Box>

          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: 'center', 
            mt: 2 
          }}>
            <Button
              variant="outlined"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            
            <Typography>
              Page {page} of {totalPages || 1}
            </Typography>

            <Button
              variant="outlined"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ArticleList;
