const express = require('express');
const path = require('path');
const router = express.Router();

router.get('/files/:filename', (req, res) => {
  try {
    const decodedFilename = decodeURIComponent(req.params.filename);
    const filePath = path.join(__dirname, '../uploads', decodedFilename);
    
    res.download(filePath, decodedFilename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(404).json({ error: 'File not found' });
      }
    });
  } catch (error) {
    console.error('File request error:', error);
    res.status(400).json({ error: 'Invalid filename' });
  }
});

module.exports = router;