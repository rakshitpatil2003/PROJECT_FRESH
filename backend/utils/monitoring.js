const mongoose = require('mongoose');

const monitorDBConnection = () => {
  mongoose.connection.on('error', err => {
    console.error('MongoDB error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected successfully');
  });
};

module.exports = { monitorDBConnection };