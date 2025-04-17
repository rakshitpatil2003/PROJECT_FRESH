// backend/utils/opensearch.js
const { Client } = require('@opensearch-project/opensearch');

const client = new Client({
  node: 'http://192.168.1.165:9200',
  // Add authentication if needed
});

module.exports = client;