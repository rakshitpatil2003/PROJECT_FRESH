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
        // Use ordered: false to continue insertion even if some documents fail
        const result = await Log.insertMany(logsToInsert, { 
          ordered: false,
          // Add timestamp to track when the log was stored
          timestamps: true
        });
        
        console.log(`Successfully stored ${result.length} new logs`);
        console.log('Sample timestamp from stored logs:', 
          result[0]?.timestamp?.toISOString());
        
      } catch (insertError) {
        // Handle bulk insert errors
        if (insertError.writeErrors) {
          console.error(`${insertError.writeErrors.length} errors during log insertion`);
          insertError.writeErrors.forEach(error => {
            if (error.code !== 11000) { // Ignore duplicate key errors
              console.error('Insert error:', error.errmsg);
            }
          });
        } else {
          throw insertError;
        }
      }
    }

  } catch (error) {
    console.error('Error in fetchLogsFromGraylog:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
};

module.exports = {
  fetchLogsFromGraylog
};