const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { validateToken, validateTokenNumber, validatePagination } = require('../middleware/validation.middleware');
const {
  generateToken,
  getUserTokens,
  getTokenDetails,
  cancelToken
} = require('../controllers/token.controller');

// Protected routes
router.post('/token', protect, validateToken, generateToken);
router.get('/tokens/my', protect, validatePagination, getUserTokens);
router.put('/token/:number/cancel', protect, validateTokenNumber, cancelToken);

// Public routes
router.get('/token/:number', validateTokenNumber, getTokenDetails);

module.exports = router;