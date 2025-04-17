// backend/models/Log.js - Updated Schema with time-based considerations
const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  uniqueIdentifier: { type: String, required: true },
  id: { type: String }, // The unique ID from the log message
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
  syscheck: {
    path: { type: String },
    mode: { type: String },
    event: { type: String },
    size_after: { type: String },
    size_before: { type: String },
    md5_after: { type: String },
    md5_before: { type: String },
    sha1_after: { type: String },
    sha1_before: { type: String },
    sha256_after: { type: String },
    sha256_before: { type: String },
    mtime_after: { type: String },
    mtime_before: { type: String },
    attrs_after: { type: Array },
    attrs_before: { type: Array },
    win_perm_after: { type: Array },
    win_perm_before: { type: Array }
  },
  location: { type: String },
  data: { type: mongoose.Schema.Types.Mixed },
  rawLog: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Keep only the most frequently used indexes
LogSchema.index({ timestamp: -1 });
LogSchema.index({ timestamp: -1, 'rule.level': 1 });
LogSchema.index({ 'rule.level': 1 });
LogSchema.index({ 'agent.name': 1 });
LogSchema.index({ uniqueIdentifier: 1 }, { unique: true });
LogSchema.index({ id: 1 });
LogSchema.index({ 'rule.description': 1 });
LogSchema.index({ 'network.srcIp': 1 });
LogSchema.index({ 'network.destIp': 1 });
LogSchema.index({ 'syscheck.path': 1 });
LogSchema.index({ 'rule.groups': 1 });
LogSchema.index({ 'data.action': 1 });

// Pre-save hook for generating uniqueIdentifier using the id field if available
LogSchema.pre('save', function(next) {
  if (!this.uniqueIdentifier && this.id) {
    // Use the id that comes from the logs
    this.uniqueIdentifier = this.id;
  } else if (!this.uniqueIdentifier) {
    // Fallback if id isn't available
    const rawLogStr = JSON.stringify(this.rawLog);
    this.uniqueIdentifier = `${this.timestamp.toISOString()}_${require('crypto').createHash('md5').update(rawLogStr).digest('hex')}`;
  }
  next();
});

// Create models for different time periods
const LogCurrent = mongoose.model('LogCurrent', LogSchema, 'logs_current'); // Last 7 days
const LogRecent = mongoose.model('LogRecent', LogSchema, 'logs_recent');   // 8-21 days
const LogArchive = mongoose.model('LogArchive', LogSchema, 'logs_archive'); // 22-90 days

// Helper function to determine which collection to use based on timestamp
const getLogModelForDate = (date) => {
  const now = new Date();
  const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 7) return LogCurrent;
  if (daysDiff < 21) return LogRecent;
  return LogArchive;
};

// Helper function to get the appropriate model for a query based on time range
const getLogModelForQuery = (timeRange) => {
  if (!timeRange || !timeRange.startDate) return LogCurrent;
  
  const now = new Date();
  const startDate = new Date(timeRange.startDate);
  const daysDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  
  // If query spans multiple collections, return an array of models to query
  if (daysDiff >= 21) return [LogCurrent, LogRecent, LogArchive];
  if (daysDiff >= 7) return [LogCurrent, LogRecent];
  return LogCurrent;
};

module.exports = {
  LogCurrent,
  LogRecent,
  LogArchive,
  getLogModelForDate,
  getLogModelForQuery
};