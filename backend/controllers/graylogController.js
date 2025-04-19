// backend/controllers/graylogController.js
require('dotenv').config();
const axios = require('axios');
const { LogCurrent, getLogModelForDate } = require('../models/Log');
const crypto = require('crypto');

const handleFetchError = (error) => {
  const errorDetails = {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    timestamp: new Date().toISOString()
  };  
  console.error('Error fetching logs:', errorDetails);
  return errorDetails;
};

// Improved insertLogs function using the new collection structure
const insertLogs = async (logsToInsert) => {
  try {
    // Group logs by which collection they should go to
    const logsByCollection = logsToInsert.reduce((acc, log) => {
      const model = getLogModelForDate(log.timestamp);
      const modelName = model.modelName;
      
      if (!acc[modelName]) acc[modelName] = [];
      acc[modelName].push(log);
      
      return acc;
    }, {});
    
    // Process each collection's logs
    const results = await Promise.all(
      Object.entries(logsByCollection).map(async ([modelName, logs]) => {
        // Get the model for this collection
        const model = Object.values(require('../models/Log'))
          .find(m => m.modelName === modelName);
        
        if (!model) {
          console.error(`Model ${modelName} not found`);
          return { collection: modelName, upsertedCount: 0, errorCount: logs.length };
        }
        
        // Use bulkWrite with upsert to prevent duplicates
        const operations = logs.map(log => {
          // Extract the id from the rawLog if available
          const messageId = log.rawLog?.message?.id || log.rawLog?.id;
          let uniqueIdentifier;
          
          if (messageId) {
            log.id = messageId;
            uniqueIdentifier = `${log.timestamp.toISOString()}_${messageId}`;
          } else {
            const rawLogStr = JSON.stringify(log.rawLog);
            uniqueIdentifier = `${log.timestamp.toISOString()}_${crypto.createHash('md5').update(rawLogStr).digest('hex')}`;
          }
          
          return {
            updateOne: {
              filter: { uniqueIdentifier },
              update: { $setOnInsert: { ...log, uniqueIdentifier } },
              upsert: true
            }
          };
        });
        
        // Execute the bulk write
        try {
          const result = await model.bulkWrite(operations, { ordered: false });
          return { 
            collection: modelName, 
            upsertedCount: result.upsertedCount,
            errorCount: 0
          };
        } catch (error) {
          // Handle duplicate key errors gracefully
          if (error.writeErrors) {
            const duplicates = error.writeErrors.filter(err => err.code === 11000).length;
            const otherErrors = error.writeErrors.filter(err => err.code !== 11000);
            
            if (otherErrors.length > 0) {
              console.error(`Non-duplicate errors for ${modelName}:`, otherErrors);
            }
            
            return { 
              collection: modelName, 
              upsertedCount: operations.length - error.writeErrors.length,
              errorCount: otherErrors.length,
              duplicates
            };
          }
          
          console.error(`Error during bulk write to ${modelName}:`, error);
          return { collection: modelName, upsertedCount: 0, errorCount: operations.length };
        }
      })
    );
    
    // Summarize results
    const summary = results.reduce((acc, result) => {
      acc.total += result.upsertedCount;
      acc.errors += result.errorCount;
      acc.duplicates += result.duplicates || 0;
      return acc;
    }, { total: 0, errors: 0, duplicates: 0 });
    
    console.log(`Processed ${logsToInsert.length} logs:`, {
      inserted: summary.total,
      errors: summary.errors,
      duplicates: summary.duplicates,
      byCollection: results.map(r => `${r.collection}: ${r.upsertedCount}`)
    });
    
    return summary;
  } catch (error) {
    console.error('Error in insertLogs:', error);
    throw error;
  }
};

const fetchLogsFromGraylog = async () => {
  try {
    const graylogUrl = `http://${process.env.GRAYLOG_HOST}:${process.env.GRAYLOG_PORT}/api/search/universal/absolute`;  
    
    // Get logs from the last 30 seconds to ensure we don't miss any
    const from = new Date(Date.now() - 30000);
    const to = new Date();    
    console.log(`Fetching logs from ${from.toISOString()} to ${to.toISOString()}`);
    
    const response = await axios.get(graylogUrl, {
      params: {
        query: '*',
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 1000,
        fields: 'timestamp,source,level,message,src_ip,dest_ip,protocol,rule_level,rule_description,event_type,agent_name,manager_name,id,ai_ml_logs'
      },
      auth: {
        username: process.env.GRAYLOG_USERNAME,
        password: process.env.GRAYLOG_PASSWORD
      },
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.messages) {
      console.log('No new logs found in this fetch');
      return;
    }
    
    console.log(`Fetched ${response.data.messages.length} logs from Graylog`);
    
    const logsToInsert = response.data.messages.map(msg => {
      let parsedMessage;
      try {
        // Try to parse the message if it's a string
        parsedMessage = typeof msg.message === 'string' ? 
          JSON.parse(msg.message) : msg.message;
      } catch (e) {
        parsedMessage = msg.message;
      }
      
      const syscheckData = parsedMessage?.syscheck || {};
      const location = parsedMessage?.location || '';
      //const mlData = parsedMessage?.ai_ml_logs || {};
      
      
      // Preserve original timestamp from the log
      const timestamp = parsedMessage?.data?.timestamp || 
                       parsedMessage?.timestamp || 
                       msg.message.timestamp;
      
      // Extract rule level with proper fallbacks
      const ruleLevel = (() => {
        // Get the raw level value
        const rawLevel = parsedMessage?.rule?.level || 
                        msg.message.rule_level || 
                        msg.message.level || 
                        '0';
        
        // If it's already a number (or numeric string), return it as is
        if (!isNaN(rawLevel) && rawLevel !== '') {
          return String(rawLevel);
        }
        
        // Handle text-based severity levels and convert to numeric values
        switch(String(rawLevel).toLowerCase()) {
          case 'alert': return '14';
          case 'critical': return '13';
          case 'error': return '12';
          case 'warning': return '8'; 
          case 'notice': return '5';
          case 'information': return '3';
          case 'debug': return '1';
          default: return '0';
        }
      })();
      
      // Extract the id from the message - it's in message.id or rawLog.id
      const logId = parsedMessage?.id || 
      msg.message.id || 
      parsedMessage?.data?.id || 
      parsedMessage?.rawLog?.id;
      
      // Log high-level alerts for monitoring
      if (parseInt(ruleLevel) >= 12) {
        console.log('High-level log detected:', {
          timestamp,
          level: ruleLevel,
          description: parsedMessage?.rule?.description || msg.message.rule_description,
          id: logId
        });
      }
      
      // Extract the data field
      const data = parsedMessage?.data || {};
      
      return {
        timestamp: new Date(timestamp),
        id: logId, // Store the id field
        agent: { 
          name: parsedMessage?.agent?.name || 
                parsedMessage?.manager?.name || 
                msg.message.agent_name || 
                msg.message.manager_name || 
                msg.message.source || 
                'unknown'
        },
        rule: {
          level: ruleLevel,
          description: parsedMessage?.rule?.description || 
                      msg.message.rule_description || 
                      msg.message.message || 
                      'No description',
          groups: parsedMessage?.rule?.groups || []
        },
        network: {
          srcIp: parsedMessage?.data?.srcip || 
                parsedMessage?.data?.src_ip || 
                msg.message.src_ip || 
                null,
          destIp: parsedMessage?.data?.destip || 
                 parsedMessage?.data?.dest_ip || 
                 msg.message.dest_ip || 
                 null,
          protocol: parsedMessage?.data?.proto || 
                   msg.message.protocol || 
                   null
        },
        syscheck: {
          path: syscheckData.path || '',
          mode: syscheckData.mode || '',
          event: syscheckData.event || '',
          size_after: syscheckData.size_after || '',
          size_before: syscheckData.size_before || '',
          md5_after: syscheckData.md5_after || '',
          md5_before: syscheckData.md5_before || '',
          sha1_after: syscheckData.sha1_after || '',
          sha1_before: syscheckData.sha1_before || '',
          sha256_after: syscheckData.sha256_after || '',
          sha256_before: syscheckData.sha256_before || '',
          mtime_after: syscheckData.mtime_after || '',
          mtime_before: syscheckData.mtime_before || '',
          attrs_after: syscheckData.attrs_after || [],
          attrs_before: syscheckData.attrs_before || [],
          win_perm_after: syscheckData.win_perm_after || [],
          win_perm_before: syscheckData.win_perm_before || []
        },
        location: location,
        // Add data field to store the complete data object
        //ai_ml_logs: parsedMessage?.ai_ml_logs || {},
        data: data,
        ai_ml_logs: (() => {
          // Try to extract ai_ml_logs from various locations
          const mlData = parsedMessage?.ai_ml_logs || 
                        parsedMessage?.data?.ai_ml_logs || 
                        msg.message?.ai_ml_logs;
                        
          if (mlData) {
            // If found, return a fully structured object with defaults for missing fields
            return {
              timestamp: mlData.timestamp || '',
              log_analysis: mlData.log_analysis || '',
              anomaly_detected: mlData.anomaly_detected || 0,
              anomaly_score: mlData.anomaly_score || 0,
              original_log_id: mlData.original_log_id || '',
              original_source: mlData.original_source || '',
              analysis_timestamp: mlData.analysis_timestamp || '',
              anomaly_reason: mlData.anomaly_reason || '',
              trend_info: {
                is_new_trend: mlData.trend_info?.is_new_trend || false,
                explanation: mlData.trend_info?.explanation || '',
                similarity_score: mlData.trend_info?.similarity_score || 0
              },
              score_explanation: {
                model: mlData.score_explanation?.model || '',
                raw_score: mlData.score_explanation?.raw_score || 0,
                normalized_score: mlData.score_explanation?.normalized_score || 0,
                explanation: mlData.score_explanation?.explanation || '',
                top_contributing_features: mlData.score_explanation?.top_contributing_features || {}
              }
            };
          }
          return null;
        })(),
        // Keep storing rawLog as before
        rawLog: parsedMessage || msg.message
      };
    });
    
    if (logsToInsert.length > 0) {
      try {
        await insertLogs(logsToInsert);
      } catch (error) {
        console.error('Failed to insert logs:', error.message);
      }
    }
  } catch (error) {
    const errorDetails = handleFetchError(error);
    console.error('Error in fetchLogsFromGraylog:', errorDetails);
  }
};

module.exports = {
  fetchLogsFromGraylog
};