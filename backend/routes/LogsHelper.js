// routes/LogsHelper.js
const { LogCurrent, LogRecent, LogArchive, getLogModelForQuery } = require('../models/Log');

// Helper function to determine which collections to query based on time range
function getModelsForTimeRange(timeRange) {
  const now = new Date();
  
  let startDate;
  let models;

  switch (timeRange) {
    case '1h':
      startDate = new Date(now - 1 * 60 * 60 * 1000);
      models = [LogCurrent];
      break;
    case '3h':
      startDate = new Date(now - 3 * 60 * 60 * 1000);
      models = [LogCurrent];
      break;
    case '12h':
      startDate = new Date(now - 12 * 60 * 60 * 1000);
      models = [LogCurrent];
      break;
    case '24h':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      models = [LogCurrent];
      break;
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      models = [LogCurrent];
      break;
    case '30d':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      models = [LogCurrent, LogRecent];
      break;
    case '90d':
      startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
      models = [LogCurrent, LogRecent, LogArchive];
      break;
    default:
      startDate = new Date(now - 24 * 60 * 60 * 1000); // Default to 24h
      models = [LogCurrent];
  }

  return { models, startDate };
}

// Helper function to execute queries across multiple collections
async function queryMultipleCollections(query, options = {}) {
  const { models, sort = { timestamp: -1 }, limit = 1000, skip = 0, projection = null } = options;
  
  let results = [];
  let remaining = limit;

  // Get total count
  const countPromises = models.map(model => model.countDocuments(query));
  const counts = await Promise.all(countPromises);
  const totalCount = counts.reduce((total, count) => total + count, 0);
  
  // Query each collection
  for (const model of models) {
    if (remaining <= 0) break;
    
    const modelResults = await model.find(query, projection)
      .sort(sort)
      .skip(results.length === 0 ? skip : 0)
      .limit(remaining)
      .lean();
      
    results = results.concat(modelResults);
    remaining = limit - results.length;
  }
  
  return { data: results, total: totalCount };
}

// Helper function to run aggregation across multiple collections
// LogsHelper.js
async function aggregateMultipleCollections(pipeline, options = {}) {
  console.log('Starting aggregateMultipleCollections with models:', 
              options.models.map(m => m.modelName).join(', '));
  
  const { models } = options;
  
  try {
    // Run aggregate on each model
    const promiseResults = await Promise.allSettled(
      models.map(model => {
        console.log(`Running aggregate on model: ${model.modelName}`);
        return model.aggregate(pipeline).exec();
      })
    );
    
    // Check for any errors
    const errors = promiseResults
      .filter(r => r.status === 'rejected')
      .map(r => r.reason);
    
    if (errors.length > 0) {
      console.error('Some aggregations failed:', errors);
    }
    
    // Get successful results
    const results = promiseResults
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value || []);
    
    // Flatten and return results
    const flattenedResults = results.flat();
    console.log(`Aggregation complete. Total results: ${flattenedResults.length}`);
    return flattenedResults;
  } catch (error) {
    console.error('Error in aggregateMultipleCollections:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

function getDateRangeForQuery(timeRange) {
  const now = new Date();
  
  let startDate;
  
  switch (timeRange) {
    case '12h':
      startDate = new Date(now - 12 * 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '3d':
      startDate = new Date(now - 3 * 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 24 * 60 * 60 * 1000);
  }
  
  return { startDate, endDate: now };
}

module.exports = {
  getModelsForTimeRange,
  queryMultipleCollections,
  aggregateMultipleCollections,
  getDateRangeForQuery,
  LogCurrent,
  LogRecent,
  LogArchive
};