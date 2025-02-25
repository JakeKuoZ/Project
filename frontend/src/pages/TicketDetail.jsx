// TicketDetail.jsx

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  Chip, 
  Stack, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  TextField
} from '@mui/material';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import DOMPurify from 'dompurify';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import API_BASE_URL from '../config';

const TicketDetail = ({ isAdmin }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // For status updates
  const [status, setStatus] = useState('');
  // For assignment updates
  const [assignedTo, setAssignedTo] = useState('');
  const [admins, setAdmins] = useState([]);

  // For new comment
  const [newComment, setNewComment] = useState('');

  const isImageFile = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
  };
  
  const getFileUrl = (filename) => {
    const baseName = filename.split(/[\\/]/).pop();
    return `${API_BASE_URL}uploads/${encodeURIComponent(baseName)}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ticketRes = await axios.get(`/api/tickets/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setTicket(ticketRes.data);
        setStatus(ticketRes.data.status);
        setAssignedTo(ticketRes.data.assignedTo?._id || '');

        if (isAdmin) {
          // fetch all admins for assignment
          const adminsRes = await axios.get('/api/users/admins', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          setAdmins(adminsRes.data);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch ticket details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isAdmin]);

  // Update the ticket’s status
  const handleStatusChange = async () => {
    try {
      await axios.put(`/api/tickets/${id}`, { status }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      enqueueSnackbar('Status updated successfully', { variant: 'success' });

      // Refresh the ticket data
      const updatedRes = await axios.get(`/api/tickets/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTicket(updatedRes.data);
    } catch (err) {
      enqueueSnackbar('Failed to update status', { variant: 'error' });
    }
  };

  // Assign the ticket to some admin
  const handleAssign = async () => {
    try {
      await axios.put(`/api/tickets/assign/${id}`, { assignedTo }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      enqueueSnackbar('Assignment updated successfully', { variant: 'success' });

      // Refresh
      const updatedRes = await axios.get(`/api/tickets/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTicket(updatedRes.data);
    } catch (err) {
      enqueueSnackbar('Failed to update assignment', { variant: 'error' });
    }
  };

  // Add a new comment to the ticket
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await axios.post(
        `/api/tickets/${id}/comments`, 
        { message: newComment },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      enqueueSnackbar('Comment added', { variant: 'success' });
      setNewComment('');

      // Refresh the ticket data
      const updatedRes = await axios.get(`/api/tickets/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTicket(updatedRes.data);
    } catch (err) {
      enqueueSnackbar('Failed to add comment', { variant: 'error' });
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!ticket) return null;

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h4">{ticket.title}</Typography>
        <Chip 
          label={ticket.priority} 
          color={
            ticket.priority === 'Critical' ? 'error' : 
            ticket.priority === 'High' ? 'warning' : 'info'
          }
        />
      </Stack>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Description</Typography>
        <Box
          sx={{ marginBottom: '16px' }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(ticket.description),
          }}
        />
      </Paper>

      {/* If admin or the ticket owner wants to change status -> show these controls */}
      {(isAdmin || ticket.createdBy?._id === localStorage.getItem('userId')) && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack spacing={3}>
            <Typography variant="h6">Update Ticket Status</Typography>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              onClick={handleStatusChange}
              startIcon={<AssignmentIndIcon />}
            >
              Update Status
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Admin-only: assign the ticket to an admin */}
      {isAdmin && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack spacing={3}>
            <Typography variant="h6">Assign Ticket</Typography>
            <FormControl fullWidth>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={assignedTo}
                label="Assign To"
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <MenuItem value="">Unassign</MenuItem>
                {admins.map(admin => (
                  <MenuItem key={admin._id} value={admin._id}>
                    {admin.name} ({admin.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              onClick={handleAssign}
              startIcon={<AssignmentIndIcon />}
            >
              Assign Ticket
            </Button>
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Details</Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="Created By" 
              secondary={ticket.createdBy?.name} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Created At" 
              secondary={new Date(ticket.createdAt).toLocaleString()} 
            />
          </ListItem>
          {ticket.assignedTo && (
            <ListItem>
              <ListItemText 
                primary="Assigned To" 
                secondary={ticket.assignedTo.name} 
              />
            </ListItem>
          )}
          {ticket.files?.length > 0 && (
            <ListItem>
              <ListItemText 
                primary="Attachments" 
                secondary={
                  <Stack spacing={1}>
                    {ticket.files.map((file, index) => {
                      const fileUrl = getFileUrl(file);
                      const image = isImageFile(file);
                      return (
                        <Box key={index}>
                          {image ? (
                            <img
                              src={fileUrl}
                              alt={file}
                              style={{ maxWidth: '100%', height: 'auto' }}
                            />
                          ) : (
                            <Button
                              variant="outlined"
                              component="a"
                              href={fileUrl}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download {file}
                            </Button>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                }
              />
            </ListItem>
          )}
        </List>
      </Paper>

      {/* Comments Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Comments</Typography>
        {ticket.comments?.length === 0 && (
          <Typography>No comments yet.</Typography>
        )}
        {ticket.comments?.map((comment, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Typography variant="subtitle2">
              {comment.user?.name || 'Unknown'} - {new Date(comment.timestamp).toLocaleString()}
            </Typography>
            <Typography variant="body2">{comment.message}</Typography>
          </Box>
        ))}

        {/* Add new comment */}
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Add a comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            multiline
            fullWidth
          />
          <Button variant="contained" onClick={handleAddComment}>
            Submit
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default TicketDetail;
