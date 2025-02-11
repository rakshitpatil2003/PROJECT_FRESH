const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  timestamp: { type: Date },
  agent: {
    name: { type: String, default: 'unknown' }
  },
  rule: {
    level: { type: String, default: '0' },
    description: { type: String, default: 'No description' }
  },
  network: {
    srcIp: { type: String },
    destIp: { type: String },
    protocol: { type: String }
  },
  rawLog: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

// Simple index on timestamp only
LogSchema.index({ timestamp: -1 });

const Log = mongoose.model('Log', LogSchema);

// Create indexes function that properly uses the model
const createIndexes = async () => {
  try {
    await Log.syncIndexes(); // This is safer than createIndexes()
    console.log('Indexes synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing indexes:', error);
  }
};

module.exports = Log;
module.exports.createIndexes = createIndexes;