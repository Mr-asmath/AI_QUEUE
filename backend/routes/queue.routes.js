const router = require('express').Router();
const { validateTokenNumber } = require('../middleware/validation.middleware');
const {
  getStatus,
  estimateWait,
  getStats
} = require('../controllers/queue.controller');

// Public routes
router.get('/queue/status', getStatus);
router.get('/queue/estimate/:token_number', validateTokenNumber, estimateWait);
router.get('/queue/stats', getStats);

module.exports = router;