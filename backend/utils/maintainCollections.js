// utils/maintainCollections.js
const { LogCurrent, LogRecent, LogArchive } = require('../models/Log');

async function maintainTimeBasedCollections() {
  try {
    console.log('Connected to MongoDB. Starting collection maintenance...');
    
    // 1. Move logs from current to recent (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await moveLogsToNewCollection(
      LogCurrent,
      LogRecent,
      { timestamp: { $lt: sevenDaysAgo } },
      'current to recent'
    );
    
    // 2. Move logs from recent to archive (older than 21 days)
    const twentyOneDaysAgo = new Date();
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);
    
    await moveLogsToNewCollection(
      LogRecent,
      LogArchive,
      { timestamp: { $lt: twentyOneDaysAgo } },
      'recent to archive'
    );
    
    // 3. Delete logs older than 90 days from archive
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const deleteResult = await LogArchive.deleteMany({ timestamp: { $lt: ninetyDaysAgo } });
    console.log(`Deleted ${deleteResult.deletedCount} logs older than 90 days from archive`);
    
    console.log('Collection maintenance completed successfully');
  } catch (error) {
    console.error('Error during collection maintenance:', error);
    throw error; // Re-throw to allow handling by caller
  }
}

// Helper function to move logs
async function moveLogsToNewCollection(sourceModel, targetModel, filter, operation) {
  const batchSize = 1000;
  let processedCount = 0;
  let successCount = 0;
  let totalCount = await sourceModel.countDocuments(filter);
  
  console.log(`Starting to move ${totalCount} logs from ${operation}`);
  
  if (totalCount === 0) {
    console.log(`No logs to move from ${operation}`);
    return;
  }
  
  // Process in batches using cursor for memory efficiency
  const cursor = sourceModel.find(filter).cursor();
  
  let batch = [];
  let doc;
  let errorCount = 0;
  
  try {
    while ((doc = await cursor.next()) !== null) {
      // Prepare document for the new collection
      const docObj = doc.toObject();
      
      batch.push(docObj);
      
      // Process batch if it reaches the batch size
      if (batch.length >= batchSize) {
        try {
          const results = await processBatch(batch, sourceModel, targetModel);
          successCount += results.success;
          
          // Log more details for debugging
          console.log(`Batch processing: ${results.success}/${batch.length} documents moved successfully`);
          
          if (results.success === 0 && batch.length > 0) {
            errorCount++;
            // Log a sample document on failure
            console.log('Sample document structure that failed:', JSON.stringify(batch[0], null, 2).substring(0, 500) + '...');
          }
        } catch (batchError) {
          console.error(`Batch error: ${batchError.message}`);
          errorCount++;
        }
        
        batch = [];
      }
      
      processedCount++;
      if (processedCount % 1000 === 0) {
        console.log(`Processed ${processedCount}/${totalCount} logs, success so far: ${successCount}, errors: ${errorCount}`);
      }
    }
    
    // Process remaining logs
    if (batch.length > 0) {
      const results = await processBatch(batch, sourceModel, targetModel);
      successCount += results.success;
    }
    
    console.log(`Moved ${successCount}/${totalCount} logs from ${operation}, with ${errorCount} batch errors`);
  } catch (error) {
    console.error(`Error moving logs from ${operation}:`, error);
    throw error;
  }
}

async function processBatch(batch, sourceModel, targetModel) {
  let success = 0;
  
  try {
    // Prepare documents by removing Mongoose-specific fields
    const processedDocs = batch.map(doc => {
      const cleanDoc = {...doc};
      
      // Remove _id and Mongoose metadata fields
      delete cleanDoc._id;
      delete cleanDoc.__v;
      
      // Handle timestamps correctly - preserve the original values
      // but don't let Mongoose try to manage them during insert
      const createdAt = cleanDoc.createdAt;
      const updatedAt = cleanDoc.updatedAt;
      delete cleanDoc.createdAt;
      delete cleanDoc.updatedAt;
      
      // Add them back as regular fields, not managed by Mongoose
      if (createdAt) cleanDoc.createdAt_orig = new Date(createdAt);
      if (updatedAt) cleanDoc.updatedAt_orig = new Date(updatedAt);
      
      return cleanDoc;
    });
    
    // Insert to target collection
    const operations = processedDocs.map(doc => ({
      updateOne: {
        filter: { uniqueIdentifier: doc.uniqueIdentifier },
        update: { $setOnInsert: doc },
        upsert: true
      }
    }));
    
    const result = await targetModel.bulkWrite(operations, { ordered: false });
    
    // Get unique identifiers of successfully inserted documents
    const successfulIdentifiers = processedDocs
      .filter((_, index) => result.upsertedIds[index] || result.modifiedCount > 0)
      .map(doc => doc.uniqueIdentifier);
    
    if (successfulIdentifiers.length > 0) {
      // Delete from source collection
      await sourceModel.deleteMany({ uniqueIdentifier: { $in: successfulIdentifiers } });
      success = successfulIdentifiers.length;
    }
  } catch (error) {
    console.error(`Error in batch processing: ${error.message}`);
    
    // Handle duplicate key errors gracefully
    if (error.writeErrors) {
      // For documents that were successfully written before the error
      const successfulDocs = batch.filter((doc, i) => 
        !error.writeErrors.some(err => err.index === i)
      );
      
      if (successfulDocs.length > 0) {
        const successfulIdentifiers = successfulDocs.map(doc => doc.uniqueIdentifier);
        await sourceModel.deleteMany({ uniqueIdentifier: { $in: successfulIdentifiers } });
        success = successfulDocs.length;
      }
    }
  }
  
  return { success };
}

module.exports = maintainTimeBasedCollections;