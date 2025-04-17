// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['Administrator', 'L1 Analyst', 'L2 Analyst', 'L3 Analyst'],
    required: true
  },
  department: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: function() {
      return this.fullName ? this.fullName.charAt(0).toUpperCase() : 'U';
    }
  },
  authority: {
    type: String,
    enum: ['read-only', 'read-write'],
    required: true
  },
  plan: {
    type: String,
    enum: ['Privileged', 'Platinum'],
    required: true
  },
  planExpiryDate: {
    type: Date,
    required: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Virtual for checking if user has SOAR access
UserSchema.virtual('hasSoarAccess').get(function() {
  return this.plan === 'Platinum';
});

// Virtual for checking if user has Sentinel AI access
UserSchema.virtual('hasSentinelAccess').get(function() {
  return this.plan === 'Platinum';
});

// Method to check if user has specific permission
UserSchema.methods.hasPermission = function(feature) {
  const platinumOnlyFeatures = ['soar-playbook', 'sentinel-ai'];
  
  if (platinumOnlyFeatures.includes(feature) && this.plan !== 'Platinum') {
    return false;
  }
  
  return true;
};

// Create the model
const User = mongoose.model('User', UserSchema);

module.exports = User;