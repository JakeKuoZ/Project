// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAdminUsers , searchUsers} = require('../controllers/userController');

// GET /api/users/admins
router.get('/admins', protect, getAdminUsers);
router.get('/search', protect, searchUsers);

module.exports = router;
