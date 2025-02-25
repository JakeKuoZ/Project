// Profile.jsx

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Alert, 
  CircularProgress,
  Chip,
  Paper,
  Stack,
  Divider,
  Button
} from '@mui/material';
import axios from 'axios';
import { 
  Timeline, 
  TimelineItem, 
  TimelineContent, 
  TimelineOppositeContent 
} from '@mui/lab';
import { 
  EventNote, 
  Assignment, 
  Notifications 
} from '@mui/icons-material';

import API_BASE_URL from '../config';

const Profile = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}api/dashboard`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setDashboardData(response.data);
      } catch (err) {
        setError('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // For non-admin users: display recent tickets in a timeline
  const renderUserStats = () => {
    if (!dashboardData.myTickets) return null;
    return (
      <Stack spacing={2} sx={{ mt: 3 }}>
        <Divider textAlign="left">Your Tickets</Divider>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            <EventNote sx={{ verticalAlign: 'middle', mr: 1 }} />
            Recent Tickets
          </Typography>

          <Timeline position="alternate">
            {dashboardData.myTickets.slice(0, 3).map((ticket, index) => (
              <TimelineItem key={index}>
                <TimelineOppositeContent color="text.secondary">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </TimelineOppositeContent>
                <TimelineContent>
                  <Chip 
                    label={ticket.status}
                    color={ticket.status === 'Open' ? 'success' : 'default'}
                  />
                  <Typography>{ticket.title}</Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => {
                      window.location.href = `/tickets/${ticket._id}`;
                    }}
                  >
                    View Ticket
                  </Button>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>

          <Divider sx={{ my: 2 }}>All Your Tickets</Divider>
          {dashboardData.myTickets.map(ticket => (
            <Box key={ticket._id} sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>{ticket.title}</strong> – {ticket.status}
              </Typography>
              <Button 
                variant="outlined"
                size="small"
                onClick={() => window.location.href = `/tickets/${ticket._id}`}
              >
                View
              </Button>
            </Box>
          ))}
        </Paper>
      </Stack>
    );
  };

  // Admin-only sections
  const renderAdminStats = () => {
    return (
      <Stack spacing={2} sx={{ mt: 3 }}>
        <Divider textAlign="left">Admin Dashboard</Divider>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            <Assignment sx={{ verticalAlign: 'middle', mr: 1 }} />
            Ticket Overview
          </Typography>
          <Stack direction="row" spacing={3}>
            <Chip label={`Total Tickets: ${dashboardData.totalTickets}`} color="info" />
            <Chip 
              label={`Pending Assignments: ${dashboardData.pendingAssignments}`} 
              color="warning" 
              onClick={() => {
                // Example: navigate to a "Pending Assignments" page
                window.location.href = '/pending-assignments';
              }}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>
        </Paper>

        {/* My Tickets (admin created) */}
        {dashboardData.myTickets && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              My Created Tickets (Admin)
            </Typography>
            {dashboardData.myTickets.length === 0 && (
              <Typography variant="body2">No tickets created yet.</Typography>
            )}
            {dashboardData.myTickets.map((ticket) => (
              <Box key={ticket._id} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  <strong>{ticket.title}</strong> – {ticket.status}
                </Typography>
                <Button 
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    window.location.href = `/tickets/${ticket._id}`;
                  }}
                >
                  View
                </Button>
              </Box>
            ))}
          </Paper>
        )}

        {/* NEW: Tickets assigned to me */}
        {dashboardData.myAssignedTickets && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tickets Assigned To Me
            </Typography>
            {dashboardData.myAssignedTickets.length === 0 && (
              <Typography variant="body2">You have no active assigned tickets.</Typography>
            )}
            {dashboardData.myAssignedTickets.map((ticket) => (
              <Box key={ticket._id} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  <strong>{ticket.title}</strong> – {ticket.status}
                </Typography>
                <Button 
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    window.location.href = `/tickets/${ticket._id}`;
                  }}
                >
                  View
                </Button>
              </Box>
            ))}
          </Paper>
        )}

        {/* NEW: Resolved (closed) tickets assigned to me */}
        {dashboardData.myResolvedTickets && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              My Resolved Tickets
            </Typography>
            {dashboardData.myResolvedTickets.length === 0 && (
              <Typography variant="body2">You have no resolved tickets.</Typography>
            )}
            {dashboardData.myResolvedTickets.map((ticket) => (
              <Box key={ticket._id} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  <strong>{ticket.title}</strong> – {ticket.status}
                </Typography>
                <Button 
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    window.location.href = `/tickets/${ticket._id}`;
                  }}
                >
                  View
                </Button>
              </Box>
            ))}
          </Paper>
        )}
      </Stack>
    );
  };

  // Admin articles
  const renderAdminArticles = () => {
    if (!dashboardData.myArticles) return null;
    return (
      <Stack spacing={2} sx={{ mt: 3 }}>
        <Divider textAlign="left">Articles Created By You</Divider>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>My Articles</Typography>
          {dashboardData.myArticles.length === 0 && (
            <Typography variant="body2">No articles created yet.</Typography>
          )}
          {dashboardData.myArticles.map((article) => (
            <Box key={article._id} sx={{ mb: 2 }}>
              <Typography variant="subtitle1">{article.title}</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => window.location.href = `/articles/${article._id}`}
              >
                View Article
              </Button>
            </Box>
          ))}
        </Paper>
      </Stack>
    );
  };

  // Main return
  return (
    <Box sx={{ p: 3 }}>
      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {dashboardData && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              Profile Overview
            </Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              <Chip 
                label={`Username: ${dashboardData.userProfile.username}`} 
                color="info" 
                variant="outlined"
              />
              <Chip 
                label={`Email: ${dashboardData.userProfile.email}`} 
                color="success" 
                variant="outlined"
              />
              <Chip 
                label={`Role: ${dashboardData.userProfile.role}`} 
                color="primary" 
                variant="outlined"
              />
            </Stack>
          </Box>

          <Divider />

          {/* Notifications Section */}
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Notifications sx={{ verticalAlign: 'middle', mr: 1 }} />
              Recent Notifications ({dashboardData.notifications?.length || 0})
            </Typography>
            {dashboardData.notifications?.map((notification, index) => (
              <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                • {notification.message}
              </Typography>
            ))}
          </Paper>

          {/* Role-specific sections */}
          {dashboardData.userProfile.role === 'admin' ? (
            <>
              {renderAdminStats()}
              {renderAdminArticles()}
            </>
          ) : (
            renderUserStats()
          )}
        </Paper>
      )}
    </Box>
  );
};

export default Profile;
