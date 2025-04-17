// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');

// Login controller
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user in the database
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Check if user's plan has expired
        if (new Date(user.planExpiryDate) < new Date()) {
            return res.status(401).json({ message: 'Your account has expired. Please contact an administrator.' });
        }

        // Check if user is active
        if (!user.active) {
            return res.status(401).json({ message: 'Your account is inactive. Please contact an administrator.' });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Update last login time
        user.lastLogin = new Date();
        await user.save();

        // Create a user object without the password
        const userInfo = {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            authority: user.authority,
            avatar: user.avatar,
            plan: user.plan,
            planExpiryDate: user.planExpiryDate,
            profileCompleted: user.profileCompleted
        };

        // Generate a JWT token with user info
        const token = jwt.sign(
            { userId: user._id, userInfo },
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: '1d' } // Token expires in 1 day
        );

        res.json({ token, user: userInfo });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Get user profile controller
exports.getProfile = async (req, res) => {
    try {
        // Get user from request (set by auth middleware)
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return user info without password
        const userInfo = {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            authority: user.authority,
            department: user.department,
            avatar: user.avatar,
            lastLogin: user.lastLogin,
            active: user.active,
            plan: user.plan,
            planExpiryDate: user.planExpiryDate,
            profileCompleted: user.profileCompleted,
            createdAt: user.createdAt
        };

        res.json(userInfo);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

// Update user profile controller
exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email, phone, department } = req.body;

        // Get user from database
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields
        if (fullName) user.fullName = fullName;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (department) user.department = department;

        // Mark profile as completed if all fields are filled
        if (user.fullName && user.email && user.phone && user.department) {
            user.profileCompleted = true;
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                department: user.department,
                profileCompleted: user.profileCompleted
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// Change password controller
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate inputs
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        // Get user from database
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Server error changing password' });
    }
};

// Create new user (admin only)
exports.createUser = async (req, res) => {
    try {
        // Check if requester is admin
        const admin = await User.findById(req.user.userId);
        if (admin.role !== 'Administrator') {
            return res.status(403).json({ message: 'Only administrators can create users' });
        }

        const {
            username,
            password,
            role,
            authority,
            plan,
            planExpiryDate,
            fullName,
            email,
            phone,
            department
        } = req.body;

        // Validate required fields
        if (!username || !password || !role || !authority || !plan || !planExpiryDate) {
            return res.status(400).json({
                message: 'Username, password, role, authority, plan, and planExpiryDate are required'
            });
        }

        // Check if username is already taken
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username is already taken' });
        }

        // Create new user
        const newUser = new User({
            username,
            password,
            role,
            authority,
            plan,
            planExpiryDate: new Date(planExpiryDate),
            createdBy: admin._id,
            active: true,
            // Optional fields
            fullName: fullName || '',
            email: email || '',
            phone: phone || '',
            department: department || '',
            profileCompleted: (fullName && email && phone && department) ? true : false
        });

        await newUser.save();

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser._id,
                username: newUser.username,
                role: newUser.role,
                authority: newUser.authority,
                plan: newUser.plan,
                planExpiryDate: newUser.planExpiryDate
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Server error creating user' });
    }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
    try {
        // Check if requester is admin
        const admin = await User.findById(req.user.userId);
        if (admin.role !== 'Administrator' && !['L2 Analyst', 'L3 Analyst'].includes(admin.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        // Get all users (excluding password field)
        const users = await User.find().select('-password');

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error fetching users' });
    }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if requester is admin
        const admin = await User.findById(req.user.userId);
        if (admin.role !== 'Administrator') {
            return res.status(403).json({ message: 'Only administrators can update users' });
        }

        const updateData = req.body;

        // Remove protected fields that shouldn't be updated directly
        delete updateData.password;

        // Find and update user
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error updating user' });
    }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if requester is admin
        const admin = await User.findById(req.user.userId);
        if (admin.role !== 'Administrator') {
            return res.status(403).json({ message: 'Only administrators can delete users' });
        }

        // Prevent deletion of admin users
        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (userToDelete.username === 'admin') {
            return res.status(403).json({ message: 'Cannot delete the primary admin user' });
        }

        // Delete the user
        await User.findByIdAndDelete(userId);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error deleting user' });
    }
};

// Add this controller function to verify password

// Verify password controller
exports.verifyPassword = async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }
      
      // Get the current user's ID from the JWT token
      const userId = req.user.userId;
      
      // Find the user in the database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify if the provided password matches the user's password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }
      
      // Password is valid
      return res.status(200).json({ message: 'Password verified' });
    } catch (error) {
      console.error('Error verifying password:', error);
      return res.status(500).json({ message: 'Server error verifying password' });
    }
  };

// Generate ticket controller
// Generate ticket controller - optimized to store only essential log data
exports.generateTicket = async (req, res) => {
    try {
      console.log('Generate ticket endpoint hit');
      const { logData, description, assignedToId } = req.body;
      
      console.log('Request data:', { 
        logDataPresent: !!logData,
        description,
        assignedToId
      });
      
      // Validate required data
      if (!logData) {
        console.log('Missing log data');
        return res.status(400).json({ message: 'Log data is required' });
      }
      
      // Get the current user
      const userId = req.user.userId;
      if (!userId) {
        return res.status(401).json({ message: 'User authentication failed' });
      }
      
      // Find user with proper error handling
      let user;
      try {
        user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error finding user:', error);
        return res.status(500).json({ message: 'Database error when finding user' });
      }
      
      // Extract only the necessary log information
      let logSummary = {
        originalLogId: 'unknown',
        timestamp: new Date(),
        agentName: 'unknown',
        agentId: 'unknown',
        agentIp: 'unknown',
        ruleId: 'unknown',
        ruleLevel: '0',
        ruleDescription: 'No description'
      };
      
      try {
        // Extract original log ID (this is important for future reference)
        if (logData.id) {
          logSummary.originalLogId = logData.id;
        } else if (logData.rawData && logData.rawData.id) {
          logSummary.originalLogId = logData.rawData.id;
        }
        
        // Extract timestamp
        if (logData.timestamp) {
          try {
            const parsedDate = new Date(logData.timestamp);
            if (!isNaN(parsedDate.getTime())) {
              logSummary.timestamp = parsedDate;
            }
          } catch (e) {
            console.error('Error parsing timestamp:', e);
          }
        }
        
        // Extract agent info
        if (logData.agent) {
          logSummary.agentName = logData.agent.name || 'unknown';
          logSummary.agentId = logData.agent.id || 'unknown';
          logSummary.agentIp = logData.agent.ip || 'unknown';
        }
        
        // Extract rule info
        if (logData.rule) {
          logSummary.ruleId = logData.rule.id || 'unknown';
          logSummary.ruleLevel = String(logData.rule.level || '0');
          logSummary.ruleDescription = logData.rule.description || 'No description';
        }
      } catch (error) {
        console.error('Error extracting log summary:', error);
        // Continue with default summary
      }
      
      // Create ticket with try-catch
      let newTicket;
      try {
        // Create the ticket model instance with only the essential log data
        // Generate a temporary ticketId that will be replaced by the pre-save hook
        newTicket = new Ticket({
          // Add a temporary ticketId to satisfy validation
          ticketId: `TEMP-${new mongoose.Types.ObjectId().toString()}`,
          creator: user._id,
          logSummary: logSummary,
          assignedTo: assignedToId || null,
          status: 'Open',
          statusHistory: [{
            status: 'Open',
            changedBy: user._id,
            description: description || 'Ticket opened',
            timestamp: new Date()
          }]
        });
        
        // Save with error handling
        console.log('Saving ticket with data:', JSON.stringify(newTicket, null, 2));
        await newTicket.save();
        console.log('Ticket saved successfully with ID:', newTicket.ticketId);
      } catch (error) {
        console.error('Error creating/saving ticket:', error);
        return res.status(500).json({ 
          message: 'Error creating ticket', 
          details: error.message 
        });
      }
      
      // Populate creator and assignedTo with error handling
      try {
        await newTicket.populate('creator assignedTo', 'username fullName');
      } catch (error) {
        console.error('Error populating ticket references:', error);
        // Continue without populated references
      }
      
      // Success response
      return res.status(201).json({
        message: 'Ticket generated successfully',
        ticket: newTicket
      });
    } catch (error) {
      console.error('Unhandled error in generateTicket:', error);
      return res.status(500).json({ 
        message: 'Server error generating ticket', 
        details: error.message 
      });
    }
  };

// Get user tickets controller
exports.getUserTickets = async (req, res) => {
    try {
        // Get the current user
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Determine which tickets to fetch based on user role
        let query = {};

        if (user.role !== 'Administrator') {
            // For non-admin users, show tickets they created or are assigned to
            query = {
                $or: [
                    { creator: user._id },
                    { assignedTo: user._id }
                ]
            };
        }

        // Apply status filter if provided
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Get tickets sorted by creation date (newest first)
        const tickets = await Ticket.find(query)
            .sort({ createdAt: -1 })
            .populate('creator assignedTo', 'username fullName')
            .populate('statusHistory.changedBy', 'username fullName');

        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ message: 'Server error fetching tickets' });
    }
};

// Update ticket status controller
exports.updateTicketStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, description } = req.body;

        if (!status || !['Open', 'In Review', 'Closed', 'Reopened'].includes(status)) {
            return res.status(400).json({ message: 'Valid status is required' });
        }

        // Get the current user
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the ticket
        const ticket = await Ticket.findOne({ ticketId });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check if user has permission to update ticket
        const canUpdateTicket =
            user.role === 'Administrator' ||
            user.authority === 'read-write' ||
            ticket.creator.equals(user._id) ||
            (ticket.assignedTo && ticket.assignedTo.equals(user._id));

        if (!canUpdateTicket) {
            return res.status(403).json({ message: 'You do not have permission to update this ticket' });
        }

        // Update ticket status
        ticket.updateStatus(status, user._id, description || '');
        await ticket.save();

        // Populate user references for response
        await ticket.populate('creator assignedTo', 'username fullName');
        await ticket.populate('statusHistory.changedBy', 'username fullName');

        res.json({
            message: 'Ticket status updated successfully',
            ticket
        });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ message: 'Server error updating ticket status' });
    }
};

// Assign ticket controller
exports.assignTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { assignedToId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(assignedToId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        // Get the current user
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the ticket
        const ticket = await Ticket.findOne({ ticketId });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check if user has permission to assign ticket
        const canAssignTicket =
            user.role === 'Administrator' ||
            user.authority === 'read-write' ||
            ticket.creator.equals(user._id);

        if (!canAssignTicket) {
            return res.status(403).json({ message: 'You do not have permission to assign this ticket' });
        }

        // Check if the assignee exists
        const assignee = await User.findById(assignedToId);
        if (!assignee) {
            return res.status(404).json({ message: 'Assignee not found' });
        }

        // Update ticket assignment
        ticket.assignedTo = assignedToId;

        // Add to status history
        ticket.statusHistory.push({
            status: ticket.status, // Maintain the current status
            changedBy: user._id,
            description: `Assigned to ${assignee.fullName || assignee.username}`,
            timestamp: new Date()
        });

        await ticket.save();

        // Populate user references for response
        await ticket.populate('creator assignedTo', 'username fullName');
        await ticket.populate('statusHistory.changedBy', 'username fullName');

        res.json({
            message: 'Ticket assigned successfully',
            ticket
        });
    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({ message: 'Server error assigning ticket' });
    }
};

// Check feature access
exports.checkFeatureAccess = async (req, res) => {
    try {
        const { feature } = req.params;

        // Get the current user
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check feature access
        const hasAccess = user.hasPermission(feature);

        res.json({
            access: hasAccess,
            message: hasAccess ? 'Access granted' : 'Requires Platinum plan'
        });
    } catch (error) {
        console.error('Error checking feature access:', error);
        res.status(500).json({ message: 'Server error checking feature access' });
    }
};