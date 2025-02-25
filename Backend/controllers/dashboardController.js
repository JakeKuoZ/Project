// dashboardController.js

const User = require('../models/User');
const Ticket = require('../models/Tickets');
const Article = require('../models/Articles'); // <-- Import your Article model
const Notification = require('../models/Notification');
const SOP = require('../models/SOP');
// const Message = require('../models/Messages'); // If you need messages, keep this

// Get dashboard summary
const getDashboardSummary = async (req, res) => {
  console.log('--- getDashboardSummary called ---');
  try {
    // 1) Fetch the user’s basic info
    const user = await User.findById(req.user.id).select('name email role createdAt');
    const role = user.role;
    console.log("user role need appear:",role);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // 2) Common data
    let data = {
      userProfile: {
        username: user.name,
        email: user.email,
        role: user.role,
        joined: user.createdAt,
      },
      notifications: [],
    };
    // 3) If admin, fetch admin-specific data
    if (role === 'admin') {
      // Admin sees the tickets they created
      const adminTickets = await Ticket.find({ createdBy: req.user.id })
        .sort({ createdAt: -1 });

      // Admin sees tickets assigned to them (but not closed)
      const myAssigned = await Ticket.find({ 
        assignedTo: req.user.id, 
        status: { $ne: 'Closed' }
      }).sort({ createdAt: -1 });

      // Admin sees resolved tickets assigned to them
      const myResolved = await Ticket.find({
        assignedTo: req.user.id,
        status: 'Closed'
      }).sort({ updatedAt: -1 });

      const adminArticles = await Article.find({ author: req.user.id })
        .sort({ createdAt: -1 });

      data = {
        ...data,
        totalTickets: await Ticket.countDocuments(),
        pendingAssignments: await Ticket.countDocuments({ assignedTo: null }),
        notifications: await Notification.find({ user: req.user.id, isRead: false }),
        myTickets: adminTickets,       // Tickets the admin created
        myArticles: adminArticles,     // Articles created by admin
        myAssignedTickets: myAssigned, // Tickets assigned to me
        myResolvedTickets: myResolved  // Tickets assigned & closed
      };
    } else {
      // Non-admin user
      const userTickets = await Ticket.find({ createdBy: req.user.id })
        .sort({ createdAt: -1 });
      data = {
        ...data,
        myTickets: userTickets,
        notifications: await Notification.find({ user: req.user.id, isRead: false }),
        submittedSOPs: await SOP.find({ user: req.user.id })
      };
    }

    //console.log('Sending dashboard data:', data);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in getDashboardSummary:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDashboardSummary };
