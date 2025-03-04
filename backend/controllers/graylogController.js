require('dotenv').config();
const axios = require('axios');
const Log = require('../models/Log');

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

// Extract the insertLogs function from your Log.js file
const insertLogs = async (logsToInsert) => {
  try {
    // Use bulkWrite with upsert to prevent duplicates
    const operations = logsToInsert.map(log => {
      const rawLogStr = JSON.stringify(log.rawLog);
      const uniqueIdentifier = `${log.timestamp.toISOString()}_${require('crypto').createHash('md5').update(rawLogStr).digest('hex')}`;
      
      return {
        updateOne: {
          filter: { uniqueIdentifier },
          update: { $setOnInsert: { ...log, uniqueIdentifier } },
          upsert: true
        }
      };
    });

    const result = await Log.bulkWrite(operations, { ordered: false });
    console.log(`Processed ${operations.length} logs:`, {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount
    });
    
    return result;
  } catch (error) {
    if (error.writeErrors) {
      const nonDuplicateErrors = error.writeErrors.filter(err => err.code !== 11000);
      if (nonDuplicateErrors.length > 0) {
        console.error(`Non-duplicate errors occurred: ${JSON.stringify(nonDuplicateErrors)}`);
        throw new Error(`Non-duplicate errors occurred: ${JSON.stringify(nonDuplicateErrors)}`);
      } else {
        console.log(`Ignored ${error.writeErrors.length} duplicate entries`);
      }
    } else {
      console.error('Error during bulk write:', error);
      throw error;
    }
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
        // Request all potentially relevant fields
        fields: 'timestamp,source,level,message,src_ip,dest_ip,protocol,rule_level,rule_description,event_type,agent_name,manager_name'
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

      // Preserve original timestamp from the log
      const timestamp = parsedMessage?.data?.timestamp || 
                       parsedMessage?.timestamp || 
                       msg.message.timestamp;

      // Extract rule level with proper fallbacks
      const ruleLevel = String(
        parsedMessage?.rule?.level || 
        msg.message.rule_level || 
        msg.message.level || 
        '0'
      );

      // Log high-level alerts for monitoring
      if (parseInt(ruleLevel) >= 12) {
        console.log('High-level log detected:', {
          timestamp,
          level: ruleLevel,
          description: parsedMessage?.rule?.description || msg.message.rule_description
        });
      }

      return {
        timestamp: new Date(timestamp), // Store the original timestamp
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
                      'No description'
        },
        network: {
          srcIp: parsedMessage?.data?.src_ip || 
                msg.message.src_ip || 
                null,
          destIp: parsedMessage?.data?.dest_ip || 
                 msg.message.dest_ip || 
                 null,
          protocol: parsedMessage?.data?.proto || 
                   msg.message.protocol || 
                   null
        },
        rawLog: parsedMessage || msg.message // Store the complete parsed message
      };
    });

    if (logsToInsert.length > 0) {
      try {
        // Use the bulkWrite method instead of insertMany
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