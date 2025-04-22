// backend/routes/tickets.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get ticket count endpoint
router.get('/count', async (req, res) => {
  try {
    // Connect to the database
    const db = mongoose.connection.db;
    
    // Count documents in the tickets collection
    const count = await db.collection('tickets').countDocuments();
    
    // Return the count
    res.json({ count });
  } catch (error) {
    console.error('Error counting tickets:', error);
    res.status(500).json({ message: 'Error counting tickets', error: error.message });
  }
});

module.exports = router;