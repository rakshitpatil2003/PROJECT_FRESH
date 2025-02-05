// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Mock user data (replace this with a proper user database query)
const users = [
  { id: 1, username: 'admin', password: 'admin' },
  { id: 2, username: 'rakshit', password: 'patil' }
];

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Find user in the mock data
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // Generate a JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid username or password' });
  }
});

module.exports = router;