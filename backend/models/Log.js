// backend/models/Log.js
const mongoose = require('mongoose');

//db.logs.createIndex({ timestamp: -1 });
//db.logs.createIndex({ "rule.level": 1 });

const LogSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  agent: {
    name: { type: String, required: true }
  },
  rule: {
    level: { type: String, required: true },
    description: { type: String }
  },
  network: {
    srcIp: { type: String },
    destIp: { type: String },
    protocol: { type: String }
  },
  rawLog: { type: mongoose.Schema.Types.Mixed, required: true }
}, {
  timestamps: true
});



module.exports = mongoose.model('Log', LogSchema);