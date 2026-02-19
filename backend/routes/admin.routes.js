const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { 
  validatePagination, 
  validateDateRange, 
  validateSettings,
  validateTokenNumber 
} = require('../middleware/validation.middleware');
const {
  callNext,
  resetQueue,
  getQueueHistory,
  getAnalytics,
  updateSettings,
  getUsers,
  toggleUserStatus
} = require('../controllers/admin.controller');

// All admin routes are protected and require admin role
router.use(protect, adminOnly);

// Queue management
router.put('/queue/next', callNext);
router.post('/queue/reset', resetQueue);
router.get('/queue/history', validatePagination, validateDateRange, getQueueHistory);

// Analytics
router.get('/analytics', getAnalytics);

// Settings
router.put('/settings', validateSettings, updateSettings);

// User management
router.get('/users', validatePagination, getUsers);
router.put('/users/:userId/toggle', toggleUserStatus);

module.exports = router;