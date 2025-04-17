// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    
    // Check if user still exists in the database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }
    
    // Check if user's plan has expired
    if (new Date(user.planExpiryDate) < new Date()) {
      return res.status(401).json({ message: 'Your plan has expired, please contact an administrator' });
    }
    
    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ message: 'Your account is inactive, please contact an administrator' });
    }
    
    // Set user data in request object
    req.user = decoded;
    req.user.authority = user.authority;
    req.user.role = user.role;
    req.user.plan = user.plan;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Check if user has admin role
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Administrator') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin privileges required' });
  }
};

// Check if user has read-write authority
const hasReadWriteAccess = (req, res, next) => {
  if (req.user && (req.user.authority === 'read-write' || req.user.role === 'Administrator')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Read-write privileges required' });
  }
};

// Check if user has platinum plan for premium features
const hasPlatinumAccess = (req, res, next) => {
  if (req.user && req.user.plan === 'Platinum') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Platinum plan required for this feature' });
  }
};

module.exports = { auth, isAdmin, hasReadWriteAccess, hasPlatinumAccess };