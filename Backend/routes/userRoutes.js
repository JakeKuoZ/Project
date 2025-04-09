// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAdminUsers , searchUsers, getUsersByIds} = require('../controllers/userController');

// GET /api/users/admins
router.get('/admins', protect, getAdminUsers);
router.get('/search', protect, searchUsers);
router.get('/batch', protect, getUsersByIds);
module.exports = router;
