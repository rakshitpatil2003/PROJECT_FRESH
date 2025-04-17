// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, isAdmin, hasReadWriteAccess } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);

// Protected routes - User profile management
router.get('/profile', auth, authController.getProfile);
router.patch('/profile', auth, authController.updateProfile);
router.post('/change-password', auth, authController.changePassword);

// Password verification route (for admin actions)
router.post('/verify-password', auth, authController.verifyPassword);

// Protected routes - User management (admin only)
router.post('/users', auth, isAdmin, authController.createUser);
router.get('/users', auth, authController.getAllUsers);
router.patch('/users/:userId', auth, isAdmin, authController.updateUser);
router.delete('/users/:userId', auth, isAdmin, authController.deleteUser);

// Protected routes - Ticket management
router.post('/generate-ticket', auth, authController.generateTicket);
router.get('/tickets', auth, authController.getUserTickets);
router.patch('/tickets/:ticketId/status', auth, authController.updateTicketStatus);
router.patch('/tickets/:ticketId/assign', auth, authController.assignTicket);

// Feature access check
router.get('/access/:feature', auth, authController.checkFeatureAccess);

module.exports = router;