// TicketList.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert, 
  Paper, 
  Chip, 
  Stack, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel 
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import EditIcon from '@mui/icons-material/Edit';

const TicketList = ({ isAdmin }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isAdminState, setIsAdminState] = useState(false);
  useEffect(() => {
    const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    setIsAdminState(storedIsAdmin);
  }, []);
  useEffect(() => {
    let isMounted = true;
    const fetchTickets = async () => {
      try {
        console.log('Fetching tickets...');
        const userId = localStorage.getItem('userId');
        if (!userId) throw new Error('User ID not found');
        
        const url = isAdmin 
          ? 'http://localhost:5000/api/tickets' 
          : `http://localhost:5000/api/tickets?user=${userId}`;

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (isMounted) {
          // Check if response.data exists and is an array
          if (Array.isArray(response.data)) {
            setTickets(response.data);
            setError(''); // Clear any existing errors
            console.log('Tickets fetched successfully:', response.data);
          } else {
            console.warn('Invalid response format:', response.data);
            setTickets([]);
            setError('Invalid response format');
          }
        }
      } catch (err) {
        console.error('Ticket fetch failed:', {
          error: err.response?.data,
          status: err.response?.status
        });
        
        // Set more specific error messages based on the error
        if (err.response?.status === 401) {
          setError('Authentication error. Please log in again.');
        } else if (err.response?.status === 403) {
          setError('You do not have permission to view these tickets.');
        } else if (!navigator.onLine) {
          setError('Network connection error. Please check your internet connection.');
        } else {
          setError('Failed to fetch tickets. Please try again later.');
        }
        setTickets([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchTickets();
    return () => {
      isMounted = false;
      console.log('Canceling ticket fetch');
    };
  }, [isAdminState, refreshCounter]);

  useEffect(() => {
    if (location.state?.refresh) {
      setRefreshCounter(prev => prev + 1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const columns = [
    { field: 'title', headerName: 'Title', flex: 1 },
    { field: 'priority', headerName: 'Priority', width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'Critical' ? 'error' : 
            params.value === 'High' ? 'warning' : 'info'
          }
        />
      )
    },
    { field: 'status', headerName: 'Status', width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'Closed' ? 'success' : 
            params.value === 'In Progress' ? 'primary' : 'default'
          }
        />
      )
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      valueFormatter: (params) => {
        const rawDate = (typeof params === 'object' && 'value' in params) ? params.value : params;
        
        if (!rawDate) {
          console.warn('Missing createdAt for row:', params.row);
          return 'Date Unavailable';
        }

        try {
          const date = new Date(rawDate);
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch (e) {
          console.error('Date formatting error:', {
            value: rawDate,
            error: e
          });
          return 'Invalid Date';
        }
      }
    },
    { field: 'actions', headerName: 'Actions', width: 150,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            component={Link}
            to={`/tickets/${params.id}`}
            size="small"
            startIcon={<EditIcon />}
          >
            View
          </Button>
        </Stack>
      )
    }
  ];

  if (isAdmin) {
    columns.splice(3, 0, {
      field: 'assignedTo',
      headerName: 'Assigned To',
      width: 180,
      valueGetter: (params) => params.row.assignedTo?.name || 'Unassigned'
    });
  }

  const filteredTickets = Array.isArray(tickets) 
    ? tickets.filter(ticket => {
        if (filter === 'all') return true;
        return ticket.status === filter;
      })
    : [];

  return (
    <Box sx={{ height: 600, p: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4">{isAdmin ? 'All Tickets' : 'My Tickets'}</Typography>
        {isAdmin && (
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filter}
              label="Filter"
              onChange={(e) => setFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </Select>
          </FormControl>
        )}
        <Button 
          component={Link} 
          to="/tickets/create" 
          variant="contained"
          sx={{ ml: 'auto' }}
        >
          Create New Ticket
        </Button>
      </Stack>

      {loading && <CircularProgress />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
      <Paper elevation={3}>
        <DataGrid
          rows={filteredTickets}
          columns={columns}
          pageSize={10}
          rowCount={filteredTickets.length}
          getRowId={(row) => row._id}
          rowsPerPageOptions={[10]}
          disableSelectionOnClick
          pagination
        />
      </Paper>
    </Box>
  );
};

export default TicketList;