// dashboardRoutes.js
const express = require('express');
const router = express.Router();
//const { protect } = require('../middleware/authMiddleware');
const { getDashboardSummary } = require('../controllers/dashboardController');

// Dashboard summary route
router.get('/', getDashboardSummary);

module.exports = router;