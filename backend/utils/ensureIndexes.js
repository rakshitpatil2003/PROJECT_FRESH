// utils/ensureIndexes.js
const mongoose = require('mongoose');
const { LogCurrent, LogRecent, LogArchive } = require('../models/Log');

async function ensureIndexes() {
  try {
    console.log("Ensuring MongoDB indexes for time-based collections...");
    
    // Create necessary indexes for each collection
    await Promise.all([
      // Current logs indexes
      LogCurrent.collection.createIndex({ timestamp: -1 }),
      LogCurrent.collection.createIndex({ "rule.level": 1 }),
      LogCurrent.collection.createIndex({ timestamp: -1, "rule.level": 1 }),
      LogCurrent.collection.createIndex({ "agent.name": 1 }),
      LogCurrent.collection.createIndex({ uniqueIdentifier: 1 }, { unique: true }),
      
      // Recent logs indexes
      LogRecent.collection.createIndex({ timestamp: -1 }),
      LogRecent.collection.createIndex({ "rule.level": 1 }),
      LogRecent.collection.createIndex({ timestamp: -1, "rule.level": 1 }),
      LogRecent.collection.createIndex({ "agent.name": 1 }),
      LogRecent.collection.createIndex({ uniqueIdentifier: 1 }, { unique: true }),
      
      // Archive logs indexes
      LogArchive.collection.createIndex({ timestamp: -1 }),
      LogArchive.collection.createIndex({ uniqueIdentifier: 1 }, { unique: true })
    ]);
    
    console.log("MongoDB indexes ensured successfully");
  } catch (error) {
    console.error("Error ensuring MongoDB indexes:", error);
    // Don't throw the error, just log it to prevent server startup failure
  }
}

module.exports = ensureIndexes;