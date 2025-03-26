const express = require('express');
const router = express.Router();
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  console.log('Authorization Header:', authHeader);
  console.log('Extracted Token:', token);
  console.log('JWT_SECRET:', process.env.JWT_SECRET);

  if (!token) {
    return res.status(401).json({ 
      message: 'No token provided', 
      user_access: false 
    });
  }

  try {
    // Verify token using your JWT_SECRET from .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('Decoded Token:', decoded);

    // Additional check: Ensure user is authenticated and has a role
    if (!decoded || !decoded.userInfo || !decoded.userInfo.role) {
      console.log('Insufficient permissions:', decoded);
      return res.status(403).json({ 
        message: 'Insufficient permissions', 
        user_access: false 
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token Verification Error:', error);
    return res.status(401).json({ 
      message: 'Invalid or expired token', 
      user_access: false 
    });
  }
};

// Route to check SOAR access
router.get('/access', (req, res) => {
    try {
      const userAccess = process.env.SOAR_ACCESS === 'true';
      
      res.json({ 
        user_access: userAccess,
        message: userAccess ? 'Access granted' : 'Upgrade required'
      });
    } catch (error) {
      res.status(500).json({ 
        user_access: false,
        message: 'System configuration error' 
      });
    }
});

module.exports = router;