// backend/utils/dedupLogs.js
const Log = require('../models/Log');

const removeDuplicateLogs = async () => {
  try {
    console.log('Starting duplicate log cleanup...');
    
    // Find duplicate logs based on combined criteria
    const duplicates = await Log.aggregate([
      // Group logs by relevant fields that determine uniqueness
      {
        $group: {
          _id: {
            timestamp: {
              $dateToString: {
                format: '%Y-%m-%d %H:%M:%S',
                date: '$timestamp'
              }
            },
            agentName: '$agent.name',
            // Ensure rule level is stored as string for comparison
            ruleLevel: { $toString: '$rule.level' },
            ruleDescription: '$rule.description'
          },
          docs: { $push: '$_id' },
          count: { $sum: 1 }
        }
      },
      // Filter only groups with more than one document
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    let totalRemoved = 0;

    for (const duplicate of duplicates) {
      // Keep the first document, remove others
      const docsToRemove = duplicate.docs.slice(1);
      
      const deleteResult = await Log.deleteMany({
        _id: { $in: docsToRemove }
      });

      totalRemoved += deleteResult.deletedCount;
      
      console.log(
        `Removed ${deleteResult.deletedCount} duplicates for log:`,
        `Agent: ${duplicate._id.agentName},`,
        `Level: ${duplicate._id.ruleLevel},`,
        `Time: ${duplicate._id.timestamp}`
      );
    }

    console.log(`Cleanup completed. Removed ${totalRemoved} duplicate logs`);
    return totalRemoved;
  } catch (error) {
    console.error('Error removing duplicate logs:', error);
    throw error;
  }
};

module.exports = removeDuplicateLogs;