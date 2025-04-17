// backend/models/Ticket.js
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    default: function() {
        // This default only works for new documents
        // For existing ones, it won't overwrite
        return `TEMP-${new mongoose.Types.ObjectId().toString()}`;
      }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Store only essential log data instead of the entire log
  logSummary: {
    // Original log ID to reference the full log if needed
    originalLogId: { 
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true
    },
    agentName: {
      type: String,
      default: 'unknown'
    },
    agentId: {
      type: String,
      default: 'unknown'
    },
    agentIp: {
      type: String,
      default: 'unknown'
    },
    ruleId: {
      type: String,
      default: 'unknown'
    },
    ruleLevel: {
      type: String,
      default: '0'
    },
    ruleDescription: {
      type: String,
      default: 'No description'
    }
  },
  status: {
    type: String,
    enum: ['Open', 'In Review', 'Closed', 'Reopened'],
    default: 'Open'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['Open', 'In Review', 'Closed', 'Reopened']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create a counter collection to generate sequential ticket IDs
const TicketCounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
  
const TicketCounter = mongoose.model('TicketCounter', TicketCounterSchema);

// Pre-save middleware to generate ticket ID
TicketSchema.pre('save', async function(next) {
    try {
      // Only process if it's a new ticket or the ticketId is temporary
      if (this.isNew || this.ticketId.startsWith('TEMP-')) {
        const counter = await TicketCounter.findByIdAndUpdate(
          { _id: 'ticketId' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        this.ticketId = `TICKET-${counter.seq.toString().padStart(6, '0')}`;
      }
      next();
    } catch (error) {
      console.error('Error generating ticket ID:', error);
      next(error);
    }
  });

// Add status change method
TicketSchema.methods.updateStatus = function(newStatus, userId, description = '') {
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    description,
    timestamp: new Date()
  });
  
  // Update current status
  this.status = newStatus;
};

// Create the model
const Ticket = mongoose.model('Ticket', TicketSchema);

module.exports = Ticket;