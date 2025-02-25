// ticketController.js
const fs = require('fs');
const Ticket = require('../models/Tickets');

// Create a new ticket
const createTicket = async (req, res) => {
  try {
    // Handle file uploads first
    const files = req.files?.map(file => file.path) || [];

    // Create ticket with proper user reference
    const ticket = await Ticket.create({
      title: req.body.title,
      description: req.body.description,
      htmlDescription: req.body.htmlDescription,
      priority: req.body.priority,
      status: 'Open',
      files,
      createdBy: req.user.id // Ensure we're using the authenticated user's ID
    });

    // Populate user data in response
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'name email');

    res.status(201).json(populatedTicket);
  } catch (error) {
    console.error('Ticket creation error:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.errors // Send validation errors if any
    });
  }
};

// Get all tickets
const getTickets = async (req, res) => {
  
  try {
    const filter = {};
    
    if (req.query.user) {
      filter.createdBy = req.query.user;
    }
    if (req.query.assignedTo === 'null') {
      filter.assignedTo = null;
    }

    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
      //console.log(tickets);
      //console.log(tickets[0].createdAt);

    // Disable caching
    res.set('Cache-Control', 'no-store, max-age=0');
    res.status(200).json(tickets);
  } catch (error) {
    console.error('Ticket fetch error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get a specific ticket by ID
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name email');
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a ticket by ID
const updateTicket = async (req, res) => {
  const { title, description, htmlDescription, priority, status } = req.body;
  const files = req.files ? req.files.map((file) => file.path) : [];

  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.title = title || ticket.title;
    ticket.description = description || ticket.description;
    ticket.htmlDescription = htmlDescription || ticket.htmlDescription;
    ticket.priority = priority || ticket.priority;
    ticket.status = status || ticket.status;

    if (files.length > 0) {
      ticket.files.forEach((file) => fs.unlinkSync(file)); // Delete old files
      ticket.files = files;
    }

    const updatedTicket = await ticket.save();
    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Assign a ticket to an admin
const assignTicket = async (req, res) => {
    const { assignedTo } = req.body;
  
    try {
      const ticket = await Ticket.findById(req.params.id);
  
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
  
      ticket.assignedTo = assignedTo;
  
      const updatedTicket = await ticket.save();
  
      const populatedTicket = await Ticket.findById(updatedTicket._id)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email');
  
      res.status(200).json(populatedTicket);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const addComment = async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id).populate('comments.user', 'name email');
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      if (!req.body.message) {
        return res.status(400).json({ error: 'Comment message is required' });
      }
  
      ticket.comments.push({
        user: req.user.id,
        message: req.body.message,
      });
  
      await ticket.save();
  
      // Re-populate to return fresh data
      const updatedTicket = await Ticket.findById(req.params.id)
        .populate('comments.user', 'name email role');
      res.status(200).json(updatedTicket);
    } catch (err) {
      console.error('addComment error:', err);
      res.status(500).json({ error: err.message });
    }
  };
  
// Delete a ticket by ID
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.files.forEach((file) => fs.unlinkSync(file)); // Delete associated files
    await ticket.deleteOne();
    res.status(200).json({ message: 'Ticket removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  assignTicket,
  deleteTicket,
  addComment
};