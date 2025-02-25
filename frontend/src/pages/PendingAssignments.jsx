// src/components/PendingAssignments.jsx
import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Select, 
  MenuItem, 
  Paper,
  Stack,
  Alert,
  Button
} from '@mui/material';
import axios from 'axios';
import API_BASE_URL from '../config';

const PendingAssignments = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1) Fetch unassigned tickets
      const ticketsRes = await axios.get(
        `${API_BASE_URL}api/tickets?assignedTo=null`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setTickets(ticketsRes.data);

      // 2) Fetch admin users
      const adminsRes = await axios.get(
        `${API_BASE_URL}api/users/admins`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setAdmins(adminsRes.data);

      setError('');
    } catch (err) {
      console.error('fetchData error:', err);
      setError('Failed to load pending assignments.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for assigning a ticket
  const assignTicket = async (ticketId, adminId) => {
    try {
      await axios.put(
        `${API_BASE_URL}api/tickets/assign/${ticketId}`,
        { assignedTo: adminId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      // Remove this ticket from the local list so it no longer appears as pending
      setTickets((prev) => prev.filter((t) => t._id !== ticketId));
    } catch (err) {
      console.error('assignTicket error:', err);
      setError('Failed to assign ticket.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Pending Assignments
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tickets.length === 0 ? (
        <Typography>No tickets pending assignment.</Typography>
      ) : (
        tickets.map((ticket) => (
          <Paper key={ticket._id} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              <strong>Title:</strong> {ticket.title} <br />
              <strong>Status:</strong> {ticket.status}
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              <Typography>Assign To:</Typography>
              <Select
                variant="outlined"
                defaultValue="" // blank
                displayEmpty
                onChange={(e) => assignTicket(ticket._id, e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="" disabled>
                  Select Admin...
                </MenuItem>
                {admins.map((admin) => (
                  <MenuItem key={admin._id} value={admin._id}>
                    {admin.name} ({admin.email})
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Paper>
        ))
      )}

      <Button 
        variant="outlined"
        onClick={() => window.location.href = '/profile'}
      >
        Back to Profile
      </Button>
    </Box>
  );
};

export default PendingAssignments;
