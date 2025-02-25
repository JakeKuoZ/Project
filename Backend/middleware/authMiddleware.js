// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes
const protect = async (req, res, next) => {
  // 1) Extract token from the 'Authorization' header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2) Check if no token was provided
  if (!token) {
    console.log('No token found in headers');
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  // 3) Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4) Look up the user record in Mongo
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log('Token valid, but no matching user found in DB');
      return res.status(401).json({ error: 'User not found for this token' });
    }

    // 5) Attach user info to req for downstream controllers
    console.log('Auth success, proceeding to next middleware/controller');
    req.user = {
      id: user._id,
      isAdmin: user.role === 'admin' // Attach admin status
    };
    next();

  } catch (error) {
    console.log('JWT verify threw an error:', error.message);
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
