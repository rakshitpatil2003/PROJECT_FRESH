// models/Log.js - Updated Schema
const mongoose = require('mongoose');
const LogSchema = new mongoose.Schema({
  timestamp: {type: Date},
  agent: {name: {type: String, default: 'unknown'}},
  rule: {
    level: {type: String, default: '0'},
    description: {type: String, default: 'No description'}
  },
  network: {
    srcIp: {type: String},
    destIp: {type: String},
    protocol: {type: String}
  },
  // Add specific syscheck fields
  syscheck: {
    path: {type: String},
    mode: {type: String},
    event: {type: String},
    size_after: {type: String},
    size_before: {type: String},
    md5_after: {type: String},
    md5_before: {type: String},
    sha1_after: {type: String},
    sha1_before: {type: String},
    sha256_after: {type: String},
    sha256_before: {type: String},
    mtime_after: {type: String},
    mtime_before: {type: String},
    attrs_after: {type: Array},
    attrs_before: {type: Array},
    win_perm_after: {type: Array},
    win_perm_before: {type: Array}
  },
  location: {type: String},
  data: {type: mongoose.Schema.Types.Mixed},
  rawLog: {type: mongoose.Schema.Types.Mixed},
  uniqueIdentifier: {type: String, unique: true}
},{timestamps: true});

// Keep your existing indexes
LogSchema.index({timestamp: -1, 'rule.level': 1});
LogSchema.index({'rule.level': 1, 'agent.name': 1});
LogSchema.index({'rule.level': 1, 'rule.description': 1});
// Add index for syscheck queries
LogSchema.index({location: 1});
LogSchema.index({'syscheck.event': 1});

// Keep your existing pre-save hook
LogSchema.pre('save', function(next) {
  const rawLogStr = JSON.stringify(this.rawLog);
  this.uniqueIdentifier = `${this.timestamp.toISOString()}_${require('crypto').createHash('md5').update(rawLogStr).digest('hex')}`;
  next();
});

const Log = mongoose.model('Log', LogSchema);
module.exports = Log;