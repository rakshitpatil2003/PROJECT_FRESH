// backend/utils/initDatabase.js
require('dotenv').config();
const User = require('../models/User');

// Initialize the database with an admin user
const initDatabase = async () => {
  try {
    console.log('Checking for admin user...');
    
    // Check if admin user already exists
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
      console.log('Admin user not found. Creating default admin...');
      
      // Set expiry date 1 year from now
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      // Create admin user
      const admin = new User({
        username: 'admin',
        password: 'admin', // This will be hashed by the pre-save hook
        role: 'Administrator',
        authority: 'read-write',
        plan: 'Platinum',
        planExpiryDate: expiryDate,
        active: true
      });
      
      await admin.save();
      console.log('Default admin user created successfully');
    } else {
      console.log('Admin user already exists. Skipping initialization.');
    }
    
    // Ensure indexes
    await User.collection.createIndex({ username: 1 }, { unique: true });
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

module.exports = initDatabase;