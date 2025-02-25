// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAdminUsers } = require('../controllers/userController');

// GET /api/users/admins
router.get('/admins', protect, getAdminUsers);

module.exports = router;
