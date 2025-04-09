// controllers/userController.js

const User = require('../models/User');

// GET /api/users/admins
// Returns a list of all admin users (ID, name, email).
// Only accessible to admins (optional check), or all authenticated users if you prefer.
const getAdminUsers = async (req, res) => {
  try {
    // (Optional) If you only want admins to see this list, check req.user.isAdmin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admin can view admin users.' });
    }

    // Query all users whose role is 'admin'
    const admins = await User.find({ role: 'admin' }).select('_id name email');
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const query = req.query.q || '';
    const regex = new RegExp(query, 'i'); // case-insensitive
    const users = await User.find({
      name: { $regex: regex },
    }).select('_id name email');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsersByIds = async (req, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids) {
      return res.status(400).json({ error: 'No user IDs provided' });
    }
    
    // Split the comma-separated list of IDs
    const userIds = ids.split(',').map(id => id.trim());
    
    // Fetch users by IDs
    const users = await User.find(
      { _id: { $in: userIds } },
      'name email' // Only return essential fields
    );
    
    // Return found users
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAdminUsers ,searchUsers, getUsersByIds};
