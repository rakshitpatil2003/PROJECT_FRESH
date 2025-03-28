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
    plan: 'Platinum',
    planExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    additionalInfo: {
      'Department': 'IT Security',
      'Location': 'HQ'
    }
  },
  { 
    id: 2, 
    username: 'YDCC', 
    password: 'YDCC@1234',
    fullName: 'YDCC USER',
    email: 'YDCC@example.com',
    role: 'Security Analyst',
    avatar: 'Y',
    lastLogin: new Date().toISOString(),
    active: true,
    plan: 'Basic',
    planExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    additionalInfo: {
      'Department': 'SOC',
      'Location': 'Yavatmal'
    }
  }
];

let tickets = [];
let ticketCounter = 1;
// Generate ticket route
router.post('/generate-ticket', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new ticket
    const newTicket = {
      id: `TICKET-${ticketCounter++}`,
      userId: user.id,
      userName: user.fullName,
      logData: req.body.logData, // Expect log data to be sent from frontend
      status: 'Pending',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      assignedTo: null
    };

    tickets.push(newTicket);

    res.status(201).json(newTicket);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Get user tickets route
router.get('/user-tickets', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If admin, return all tickets, else return user-specific tickets
    const userTickets = user.role === 'Administrator' 
      ? tickets 
      : tickets.filter(ticket => ticket.userId === user.id);

    res.json(userTickets);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update ticket status (for admin)
router.patch('/update-ticket/:ticketId', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user || user.role !== 'Administrator') {
      return res.status(403).json({ message: 'Unauthorized: Admin access required' });
    }

    const { ticketId } = req.params;
    const { status } = req.body;

    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    
    if (ticketIndex === -1) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    tickets[ticketIndex] = {
      ...tickets[ticketIndex],
      status,
      resolvedAt: status === 'Resolved' ? new Date().toISOString() : tickets[ticketIndex].resolvedAt
    };

    res.json(tickets[ticketIndex]);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

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
      avatar: user.avatar,
      plan: user.plan,  
      planExpiryDate: user.planExpiryDate
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
      plan: user.plan,
      planExpiryDate: user.planExpiryDate,
      additionalInfo: user.additionalInfo
    };
    
    res.json(userInfo);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;