const mongoose = require('mongoose');
const Log = require('../models/Log');

const normalizeLogLevels = async () => {
  try {
    console.log('Starting log level normalization...');
    
    // Find logs with text-based levels
    const textBasedLevels = ['alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'];
    
    const bulkOps = [];
    
    for (const level of textBasedLevels) {
      const logs = await Log.find({ 'rule.level': level });
      
      console.log(`Found ${logs.length} logs with level "${level}"`);
      
      logs.forEach(log => {
        let numericLevel = '0';
        switch(level.toLowerCase()) {
          case 'alert': numericLevel = '14'; break;
          case 'critical': numericLevel = '13'; break;
          case 'error': numericLevel = '12'; break;
          case 'warning': numericLevel = '8'; break;
          case 'notice': numericLevel = '5'; break;
          case 'info': numericLevel = '3'; break;
          case 'debug': numericLevel = '1'; break;
        }
        
        bulkOps.push({
          updateOne: {
            filter: { _id: log._id },
            update: { $set: { 'rule.level': numericLevel } }
          }
        });
      });
    }
    
    if (bulkOps.length > 0) {
      const result = await Log.bulkWrite(bulkOps);
      console.log(`Normalized ${result.modifiedCount} log entries`);
    } else {
      console.log('No logs requiring normalization found');
    }
    
    return bulkOps.length;
  } catch (error) {
    console.error('Error normalizing log levels:', error);
    throw error;
  }
};

module.exports = normalizeLogLevels;