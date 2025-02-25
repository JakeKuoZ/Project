// TicketList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import API_BASE_URL from '../config';

const TicketList = ({ isAdmin }) => {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  // If we need to refresh
  const [refreshCounter, setRefreshCounter] = useState(0);

  // 1) Check if we have "state.refresh"
  useEffect(() => {
    if (location.state?.refresh) {
      setRefreshCounter((prev) => prev + 1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // 2) Fetch tickets
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchTickets = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('No userId in localStorage');
        }

        const url = isAdmin
          ? `${API_BASE_URL}api/tickets`
          : `${API_BASE_URL}api/tickets?user=${userId}`;

        console.log('Fetching from =>', url);
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        if (isMounted) {
          if (Array.isArray(res.data)) {
            setTickets(res.data);
            setError('');
            console.log('Tickets fetched:', res.data);
          } else {
            setError('Invalid response format');
            setTickets([]);
            console.log('Invalid format =>', res.data);
          }
        }
      } catch (err) {
        console.error('Fetch error =>', err);
        setTickets([]);
        if (err.response?.status === 401) {
          setError('Unauthorized. Please log in again.');
        } else {
          setError('Failed to fetch tickets. Check console for details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTickets();
    return () => {
      isMounted = false;
      console.log('Cleanup => Canceling ticket fetch');
    };
  }, [isAdmin, refreshCounter]);

  useEffect(() => {
    if (tickets.length > 0) {
      console.log('Sample ticket data:', {
        _id: tickets[0]._id,
        assignedTo: tickets[0].assignedTo,
        hasName: tickets[0].assignedTo?.name ? true : false
      });
    }
  }, [tickets]);

  // 3) Column definitions
  const baseColumns = useMemo(() => [
    {
      field: 'title',
      headerName: 'Title',
      flex: 1
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 130,
      renderCell: (params) => {
        const val = params.value;
        return (
          <Chip
            label={val}
            color={
              val === 'Critical' ? 'error'
                : val === 'High' ? 'warning'
                : 'info'
            }
          />
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const val = params.value;
        return (
          <Chip
            label={val}
            color={
              val === 'Closed' ? 'success'
                : val === 'In Progress' ? 'primary'
                : 'default'
            }
          />
        );
      }
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      valueFormatter: (params) => {
        const dateVal = params;
        if (!dateVal) return 'N/A';
        try {
          return new Date(dateVal).toLocaleDateString();
        } catch {
          return 'Invalid date';
        }
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Button
          component={Link}
          to={`/tickets/${params.row?._id}`}
          size="small"
          startIcon={<EditIcon />}
        >
          View
        </Button>
      )
    }
  ], []);

  // Extra column for admin
  const assignedToColumn = useMemo(() => ({
    field: 'assignedTo',
    headerName: 'Assigned To',
    width: 180,
    valueGetter: (params) => {
      //console.log('ValueGetter params1:', params.name);
      // console.log('ValueGetter params:', {
      //   rowExists: !!params.row,
      //   assignedTo: params.row?.assignedTo,
      //   nameExists: params.row?.assignedTo?.name
      // });
      if(!params){
        return 'Unassigned';
      }else{
        return params.name;
      }
      // const assignedTo = params.row?.assignedTo;
      // return assignedTo?.name || 'Unassigned';
    }
  }), []);

  // Merge columns if isAdmin
  const columns = useMemo(() => {
    if (isAdmin) {
      const withAssigned = [...baseColumns];
      // Insert at index 3 => Title, Priority, Status, [AssignedTo], CreatedAt, Actions
      withAssigned.splice(3, 0, assignedToColumn);
      return withAssigned;
    }
    return baseColumns;
  }, [isAdmin, baseColumns, assignedToColumn]);

  // 4) Filter logic
  const filteredTickets = useMemo(() => {
    if (filter === 'all') return tickets;
    return tickets.filter((t) => t.status === filter);
  }, [filter, tickets]);

  // 5) Final render
  return (
    <Box sx={{ p: 3 }}>
      {/* 5A) If loading => show spinner */}
      {loading && <CircularProgress />}
      {/* 5B) If error => show alert */}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {/* 5C) Only show DataGrid if not loading & not error */}
      {!loading && !error && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h4">
              {isAdmin ? 'All Tickets' : 'My Tickets'}
            </Typography>

            {isAdmin && (
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={filter}
                  label="Status Filter"
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

          <Paper
            sx={{
              p: 1,
              width: '100%',
              minWidth: 800,
              overflow: 'hidden'
            }}
          >
            <DataGrid
              rows={filteredTickets}
              columns={columns}
              getRowId={(row) => row._id}
              pageSize={10}
              rowsPerPageOptions={[10]}
              autoHeight
              disableSelectionOnClick
              paginationMode="server"
              rowCount={filteredTickets.length} // remove "count undefined" warnings
            />
          </Paper>
        </>
      )}
    </Box>
  );
};

export default TicketList;
