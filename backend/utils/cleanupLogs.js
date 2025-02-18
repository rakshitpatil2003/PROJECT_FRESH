// backend/utils/cleanupLogs.js
const Log = require('../models/Log');

const cleanupOldLogs = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await Log.deleteMany({
      timestamp: { $lt: sevenDaysAgo }
    });

    console.log(`Cleaned up ${result.deletedCount} logs older than 7 days`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
    throw error;
  }
};

module.exports = cleanupOldLogs;