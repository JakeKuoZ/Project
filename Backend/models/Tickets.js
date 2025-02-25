// Ticket.js (Model)
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ticketSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    htmlDescription: {
      type: String,
      required: false,
    },
    priority: {
      type: String,
      required: true,
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    status: {
      type: String,
      required: true,
      enum: ['Open', 'In Progress', 'Closed'],
      default: 'Open',
    },
    files: {
      type: [String],
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    comments: [commentSchema] // Array of comments
  },
  
  {
    timestamps: true,
    strict: true
  }
);

module.exports = mongoose.model('Ticket', ticketSchema);
