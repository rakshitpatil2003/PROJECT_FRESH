require('dotenv').config();
const axios = require('axios');
const Log = require('../models/Log');

const fetchLogsFromGraylog = async () => {
  try {
    const graylogUrl = `http://${process.env.GRAYLOG_HOST}:${process.env.GRAYLOG_PORT}/api/search/universal/absolute`;
    
    const response = await axios.get(graylogUrl, {
      params: {
        query: '*',
        from: new Date(Date.now() - 10000).toISOString(), // Last 10 seconds only
        to: new Date().toISOString(),
        limit: 1000,
        fields: 'timestamp,source,level,message,src_ip,dest_ip,protocol'
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
      console.log('No new logs found');
      return;
    }

    const logsToInsert = response.data.messages.map(msg => ({
      timestamp: new Date(msg.message.timestamp),
      agent: { 
        name: msg.message.source || 'unknown' 
      },
      rule: {
        level: String(msg.message.level || '0'),
        description: msg.message.message || 'No description'
      },
      network: {
        srcIp: msg.message.src_ip || null,
        destIp: msg.message.dest_ip || null,
        protocol: msg.message.protocol || null
      },
      rawLog: msg.message
    }));

    if (logsToInsert.length > 0) {
      // Simple insert without worrying about duplicates
      await Log.insertMany(logsToInsert, { ordered: false });
      console.log(`Stored ${logsToInsert.length} new logs`);
    }

  } catch (error) {
    console.error('Error fetching/storing logs:', error.message);
  }
};

module.exports = {
  fetchLogsFromGraylog
};