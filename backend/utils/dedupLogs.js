const { LogCurrent, LogRecent, LogArchive } = require('../models/Log');

const removeDuplicateLogs = async () => {
  try {
    console.log('Starting duplicate log cleanup...');
    
    // Perform deduplication on each collection
    const collections = [LogCurrent, LogRecent, LogArchive];
    let totalRemoved = 0;
    
    for (const Collection of collections) {
      // Find all logs and group them by their native id field
      const pipeline = [
        // Only include logs that have an id field
        { $match: { id: { $exists: true, $ne: null, $ne: "" } } },
        // Group by the id field
        { $group: {
            _id: "$id",  // Group by the native id field
            count: { $sum: 1 },
            docs: { $push: "$_id" }  // Collect MongoDB _ids for deletion
          }
        },
        // Only keep groups with multiple documents
        { $match: { count: { $gt: 1 } } }
      ];
      
      const duplicateGroups = await Collection.aggregate(pipeline);
      
      // For each group of duplicates
      for (const group of duplicateGroups) {
        // Keep first document, delete the rest
        const docsToDelete = group.docs.slice(1);
        
        if (docsToDelete.length > 0) {
          const result = await Collection.deleteMany({ _id: { $in: docsToDelete } });
          totalRemoved += result.deletedCount;
          console.log(`Removed ${result.deletedCount} duplicates for id: ${group._id}`);
        }
      }
    }
    
    console.log(`Deduplication complete: removed ${totalRemoved} duplicate logs`);
    return totalRemoved;
  } catch (error) {
    console.error('Error removing duplicate logs:', error);
    throw error;
  }
};

module.exports = removeDuplicateLogs;