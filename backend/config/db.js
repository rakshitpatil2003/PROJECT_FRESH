// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4  // Use IPv4
    });
    
    console.log('MongoDB connected:');
    console.log('  Host:', conn.connection.host);
    console.log('  Port:', conn.connection.port);
    console.log('  Database:', conn.connection.name);
    
    mongoose.connection.on('error', err => {
      console.error('MongoDB error:', err);
    });
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;