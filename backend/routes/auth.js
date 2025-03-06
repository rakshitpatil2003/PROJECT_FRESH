// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Enhanced mock user data with profile information
const users = [
  { 
    id: 1, 
    username: 'admin', 
    password: 'admin',
    fullName: 'Admin User',
    email: 'admin@example.com',
    role: 'Administrator',
    avatar: 'A',
    lastLogin: new Date().toISOString(),
    active: true,
    additionalInfo: {
      'Department': 'IT Security',
      'Location': 'HQ'
    }
  },
  { 
    id: 2, 
    username: 'rakshit', 
    password: 'patil',
    fullName: 'Rakshit Patil',
    email: 'rakshit.patil@example.com',
    role: 'Security Analyst',
    avatar: 'R',
    lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    active: true,
    additionalInfo: {
      'Department': 'SOC',
      'Location': 'Remote'
    }
  }
];

// Mock request history data
const requestHistory = [
  {
    id: 'req-001',
    userId: 1,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    type: 'API Request',
    description: 'Vulnerability scan initiated',
    status: 'Completed'
  },
  {
    id: 'req-002',
    userId: 1,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    type: 'Report Generation',
    description: 'Monthly security report',
    status: 'Completed'
  },
  {
    id: 'req-003',
    userId: 2,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    type: 'API Request',
    description: 'Network traffic analysis',
    status: 'Completed'
  }
];

// Mock tokens data
const tokens = [
  {
    id: 'tok-001',
    userId: 1,
    name: 'Dashboard Access',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    expiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    active: true
  },
  {
    id: 'tok-002',
    userId: 1,
    name: 'API Integration',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    expiry: null, // Never expires
    active: true
  },
  {
    id: 'tok-003',
    userId: 2,
    name: 'Reporting Tool',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    expiry: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Expired 5 days ago
    active: false
  }
];

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Find user in the mock data
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // Update last login time
    user.lastLogin = new Date().toISOString();
    
    // Create a user object without the password
    const userInfo = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    };
    
    // Generate a JWT token with user info
    const token = jwt.sign(
      { userId: user.id, userInfo }, 
      process.env.JWT_SECRET || 'your_secret_key', 
      { expiresIn: '1h' }
    );
    
    res.json({ token, user: userInfo });
  } else {
    res.status(401).json({ message: 'Invalid username or password' });
  }
});

// Get user profile route
router.get('/profile', (req, res) => {
  // Get token from authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    
    // Find user
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user tokens
    const userTokens = tokens.filter(t => t.userId === user.id);
    
    // Return user info without password
    const userInfo = {
      id: user.id,
      username: user.username,
      name: user.fullName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
      active: user.active,
      additionalInfo: user.additionalInfo,
      tokens: userTokens
    };
    
    res.json(userInfo);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Get request history route
router.get('/requests/history', (req, res) => {
  // Get token from authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    
    // Find user's request history
    const userRequests = requestHistory.filter(req => req.userId === decoded.userId);
    
    res.json(userRequests);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;