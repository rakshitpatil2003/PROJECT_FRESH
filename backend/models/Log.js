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
  data: {
    vulnerability: {
      cve: { type: String },
      package: {
        name: { type: String },
        version: { type: String },
        architecture: { type: String },
        condition: { type: String }
      },
      severity: { type: String },
      published: { type: Date },
      updated: { type: Date },
      title: { type: String },
      cvss: {
        cvss3: {
          base_score: { type: String },
          vector: {
            attack_vector: { type: String },
            availability: { type: String },
            confidentiality_impact: { type: String },
            integrity_impact: { type: String },
            privileges_required: { type: String },
            scope: { type: String },
            user_interaction: { type: String }
          }
        }
      },
      reference: { type: String },
      rationale: { type: String },
      status: { type: String }
    }
  },
  rawLog: { type: mongoose.Schema.Types.Mixed },
  // Add a unique compound index
  uniqueIdentifier: { type: String, unique: true }
}, {
  timestamps: true
});

// Update indexes
LogSchema.index({ timestamp: -1, 'rule.level': 1 });
//LogSchema.index({ uniqueIdentifier: 1 }, { unique: true });
LogSchema.index({ 'rule.level': 1, 'agent.name': 1 });
LogSchema.index({ 'rule.level': 1, 'rule.description': 1 });

// Pre-save middleware to generate unique identifier
LogSchema.pre('save', function(next) {
  // Create a unique identifier based on timestamp and message content
  const rawLogStr = JSON.stringify(this.rawLog);
  this.uniqueIdentifier = `${this.timestamp.toISOString()}_${require('crypto').createHash('md5').update(rawLogStr).digest('hex')}`;
  next();
});

const Log = mongoose.model('Log', LogSchema);
module.exports = Log;

// controllers/graylogController.js - Update the log insertion logic
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
    
  } catch (error) {
    if (error.writeErrors) {
      const nonDuplicateErrors = error.writeErrors.filter(err => err.code !== 11000);
      if (nonDuplicateErrors.length > 0) {
        throw new Error(`Non-duplicate errors occurred: ${JSON.stringify(nonDuplicateErrors)}`);
      }
    } else {
      throw error;
    }
  }
};