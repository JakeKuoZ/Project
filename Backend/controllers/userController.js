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

module.exports = { getAdminUsers };
