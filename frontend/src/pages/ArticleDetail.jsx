import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import API_BASE_URL from '../config';

const ArticleDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  // Adjust if your server path is different
  const getFileUrl = (filename) => 
    `${API_BASE_URL}uploads/${encodeURIComponent(filename)}`;

  return (
    <Box sx={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && article && (
        <Box>
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
        </Box>
      )}
    </Box>
  );
};

export default ArticleDetail;
