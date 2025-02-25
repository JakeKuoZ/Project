// ArticleList.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Button,
  Pagination,
  TextField,
} from '@mui/material';
import axios from 'axios';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import API_BASE_URL from '../config';

const ArticleList = () => {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 5;

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}api/articles`, {
        params: { page, limit, search: searchQuery },
      });
      setArticles(res.data.articles || []);
      setTotalPages(Math.ceil((res.data.total || 0) / limit));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load articles');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [page, searchQuery]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Articles
      </Typography>

      <TextField
        label="Search articles"
        variant="outlined"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
      />

      {loading ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : articles.length === 0 ? (
        <Typography>No articles found</Typography>
      ) : (
        articles.map((article) => {
          const firstImage = getFirstImage(article);

          return (
            <Box
              key={article._id}
              sx={{
                backgroundColor: '#fff',
                borderRadius: 2,
                boxShadow: 2,
                p: 2,
                mb: 3,
              }}
            >
              {firstImage && (
                <Box
                  sx={{
                    width: '100%',
                    height: 200,
                    mb: 2,
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <img
                    src={firstImage}
                    alt="Article preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              )}

              <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>
                {article.title}
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  mt: 2,
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  '& strong': {
                    fontWeight: 'bold',
                    fontSize: 'inherit', // same font size
                    lineHeight: 'inherit',
                  },
                }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(article.content.substring(0, 200) + '...'),
                }}
              />

              {article.files?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Attachments:</Typography>
                  {article.files.map((file, i) => (
                    <Button
                      key={i}
                      component="a"
                      href={`${API_BASE_URL}uploads/${encodeURIComponent(file)}`}
                      target="_blank"
                      sx={{
                        display: 'block',
                        mt: 1,
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                      }}
                    >
                      {file}
                    </Button>
                  ))}
                </Box>
              )}

              <Button
                variant="contained"
                component={Link}
                to={`/articles/${article._id}`}
                sx={{ mt: 2 }}
              >
                Read More
              </Button>
            </Box>
          );
        })
      )}

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
          />
        </Box>
      )}
    </Container>
  );
};

function getFirstImage(article) {
  const imageFile = article.files?.find((f) =>
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f)
  );
  if (imageFile) {
    return `${API_BASE_URL}uploads/${imageFile}`;
  }
  const match = article.content.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}

export default ArticleList;
