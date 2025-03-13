// models/Log.js
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
  // Store the data field as is
  data: { type: mongoose.Schema.Types.Mixed },
  syscheck: { type: mongoose.Schema.Types.Mixed },
  // Continue storing rawLog as before
  rawLog: { type: mongoose.Schema.Types.Mixed },
  // Keep using uniqueIdentifier
  uniqueIdentifier: { type: String, unique: true }
}, {
  timestamps: true
});

// Update indexes - Keep the original indexes
LogSchema.index({ timestamp: -1, 'rule.level': 1 });
LogSchema.index({ 'rule.level': 1, 'agent.name': 1 });
LogSchema.index({ 'rule.level': 1, 'rule.description': 1 });

// Pre-save middleware to generate unique identifier - unchanged
LogSchema.pre('save', function(next) {
  // Create a unique identifier based on timestamp and message content
  const rawLogStr = JSON.stringify(this.rawLog);
  this.uniqueIdentifier = `${this.timestamp.toISOString()}_${require('crypto').createHash('md5').update(rawLogStr).digest('hex')}`;
  next();
});

const Log = mongoose.model('Log', LogSchema);
module.exports = Log;