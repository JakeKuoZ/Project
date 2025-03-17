// src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';

import API_BASE_URL from '../config';

const Home = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Assumes you're *always* logged in and have user data in localStorage:
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        if (!token) {
          // If there's truly no guest scenario, you might just do a redirect or an error.
          throw new Error('No token found. Please log in and try again.');
        }
        // Fetch the dashboard summary:
        const res = await axios.get(`${API_BASE_URL}api/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setSummaryData(res.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [token]);

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" mt={4}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!summaryData || !user) {
    // No guest scenario, but just in case
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h5" color="error">
          No data to display. Please log in.
        </Typography>
      </Box>
    );
  }

  // If user is admin, summaryData might contain: totalTickets, pendingAssignments, etc.
  const isAdmin = user.role === 'admin';

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Hello, {summaryData.userProfile?.username}!
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Role: {summaryData.userProfile?.role} | Joined: {new Date(summaryData.userProfile?.joined).toLocaleDateString()}
      </Typography>

      {/** Example stats section */}
      <Grid container spacing={2}>
        {isAdmin && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Total Tickets</Typography>
                  <Typography variant="h5">
                    {summaryData.totalTickets ?? 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Pending Assignments</Typography>
                  <Typography variant="h5">
                    {summaryData.pendingAssignments ?? 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Everyone sees "My Tickets" */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">My Tickets</Typography>
              <Typography variant="h5">
                {summaryData.myTickets?.length ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/** Additional sections (articles, assigned tickets, etc.) */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          {isAdmin ? 'My Assigned Tickets' : 'My Recent Tickets'}
        </Typography>
        {isAdmin
          ? (
            <Typography>
              You have {summaryData.myAssignedTickets?.length || 0} open tickets assigned to you,
              and {summaryData.myResolvedTickets?.length || 0} tickets resolved.
            </Typography>
          ) : (
            <Typography>
              You have {summaryData.myTickets?.length || 0} total tickets.
            </Typography>
          )
        }
      </Box>
    </Box>
  );
};

export default Home;
