const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s
    });

    console.log('MongoDB connected:');
    console.log('  Host:', conn.connection.host);
    console.log('  Port:', conn.connection.port);
    console.log('  Database:', conn.connection.name);

    // Handle connection errors after initial connection
    mongoose.connection.on('error', err => {
      console.error('MongoDB error after connection:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error('MongoDB connection error:');
    console.error('  Error type:', error.name);
    console.error('  Error message:', error.message);
    console.error('  MongoDB URI:', process.env.MONGO_URI.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@'));
    console.error('  Full error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;