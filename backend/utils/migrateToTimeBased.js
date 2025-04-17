// backend/utils/migrateToTimeBased.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Connect to MongoDB
connectDB();

async function migrateLogsToTimeBasedCollections() {
  const oldLogModel = mongoose.model('OldLog', new mongoose.Schema({}, { strict: false }), 'logs');
  const {
    LogCurrent,
    LogRecent,
    LogArchive,
    getLogModelForDate
  } = require('../models/Log');

  console.log('Starting migration of logs to time-based collections...');
  
  // Set up counters
  let processedCount = 0;
  let currentCount = 0;
  let recentCount = 0;
  let archiveCount = 0;
  let errorCount = 0;
  
  // Process in batches using a cursor for memory efficiency
  const batchSize = 1000;
  const cursor = oldLogModel.find({}).cursor();
  
  let batch = [];
  let log;
  
  try {
    while ((log = await cursor.next()) !== null) {
      // Prepare the log for migration
      try {
        const timestamp = new Date(log.timestamp);
        if (isNaN(timestamp.getTime())) {
          console.error(`Invalid timestamp for log ID ${log._id}, skipping`);
          errorCount++;
          continue;
        }
        
        // Extract the id from the log if available
        let id = null;
        if (log.rawLog && log.rawLog.message && log.rawLog.message.id) {
          id = log.rawLog.message.id;
        } else if (log.rawLog && log.rawLog.id) {
          id = log.rawLog.id;
        }
        
        // Create uniqueIdentifier
        let uniqueIdentifier;
        if (id) {
          uniqueIdentifier = `${timestamp.toISOString()}_${id}`;
        } else if (log.uniqueIdentifier) {
          uniqueIdentifier = log.uniqueIdentifier;
        } else {
          const rawLogStr = JSON.stringify(log.rawLog);
          uniqueIdentifier = `${timestamp.toISOString()}_${require('crypto').createHash('md5').update(rawLogStr).digest('hex')}`;
        }
        
        // Create a new document with the essential fields
        const newDoc = {
          ...log.toObject(),
          timestamp,
          uniqueIdentifier,
          id
        };
        
        // Remove MongoDB specific fields
        delete newDoc._id;
        
        // Determine target collection based on age
        const targetModel = getLogModelForDate(timestamp);
        
        batch.push({
          model: targetModel,
          doc: newDoc
        });
        
        // Process batch if it reaches the batch size
        if (batch.length >= batchSize) {
          await processBatch(batch);
          batch = [];
        }
        
        processedCount++;
        if (processedCount % 10000 === 0) {
          console.log(`Processed ${processedCount} logs...`);
        }
      } catch (error) {
        console.error(`Error processing log: ${error.message}`);
        errorCount++;
      }
    }
    
    // Process remaining logs
    if (batch.length > 0) {
      await processBatch(batch);
    }
    
    console.log('Migration completed successfully!');
    console.log(`Total logs processed: ${processedCount}`);
    console.log(`Logs in current collection: ${currentCount}`);
    console.log(`Logs in recent collection: ${recentCount}`);
    console.log(`Logs in archive collection: ${archiveCount}`);
    console.log(`Errors: ${errorCount}`);
  } catch (error) {
    console.error(`Migration failed: ${error.message}`);
  } finally {
    await mongoose.connection.close();
  }
  
  async function processBatch(batch) {
    // Group by target model
    const grouped = batch.reduce((acc, item) => {
      const modelName = item.model.modelName;
      if (!acc[modelName]) acc[modelName] = [];
      acc[modelName].push(item.doc);
      return acc;
    }, {});
    
    // Process each group
    for (const [modelName, docs] of Object.entries(grouped)) {
      try {
        // Use bulkWrite with ordered: false for better performance
        const operations = docs.map(doc => ({
          updateOne: {
            filter: { uniqueIdentifier: doc.uniqueIdentifier },
            update: { $setOnInsert: doc },
            upsert: true
          }
        }));
        
        const model = batch.find(item => item.model.modelName === modelName).model;
        const result = await model.bulkWrite(operations, { ordered: false });
        
        // Update counters
        if (modelName === 'LogCurrent') currentCount += result.upsertedCount;
        else if (modelName === 'LogRecent') recentCount += result.upsertedCount;
        else if (modelName === 'LogArchive') archiveCount += result.upsertedCount;
      } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.writeErrors) {
          const duplicates = error.writeErrors.filter(err => err.code === 11000).length;
          const otherErrors = error.writeErrors.filter(err => err.code !== 11000).length;
          
          if (otherErrors > 0) {
            console.error(`Non-duplicate errors: ${otherErrors}, model: ${modelName}`);
            errorCount += otherErrors;
          }
          
          // Update counters for successful writes
          const successfulWrites = docs.length - error.writeErrors.length;
          if (modelName === 'LogCurrent') currentCount += successfulWrites;
          else if (modelName === 'LogRecent') recentCount += successfulWrites;
          else if (modelName === 'LogArchive') archiveCount += successfulWrites;
        } else {
          console.error(`Error in batch write: ${error.message}`);
          errorCount += docs.length;
        }
      }
    }
  }
}

migrateLogsToTimeBasedCollections();