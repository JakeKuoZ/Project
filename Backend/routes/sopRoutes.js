// sopRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { processSOP, getSOP, getAllSOPs } = require('../controllers/sopController');
const { protect } = require('../middleware/authMiddleware');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/sop/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Upload and process an SOP (protected)
router.post('/upload', protect, upload.single('file'), processSOP);

// Get details of a specific SOP
router.get('/:id', protect, getSOP);

// Get a list of all SOPs for a user
router.get('/', protect, getAllSOPs);

module.exports = router;