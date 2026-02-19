const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
  body('phone')
    .optional()
    .matches(/^\d{10}$/).withMessage('Please provide a valid 10-digit phone number'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Token validation
const validateToken = [
  body('age')
    .isInt({ min: 0, max: 150 }).withMessage('Please provide a valid age between 0 and 150'),
  body('emergency')
    .optional()
    .isBoolean().withMessage('Emergency must be a boolean'),
  body('token_type')
    .optional()
    .isIn(['regular', 'vip']).withMessage('Token type must be either regular or vip'),
  handleValidationErrors
];

// Queue validation
const validateTokenNumber = [
  param('number')
    .isInt({ min: 1 }).withMessage('Token number must be a positive integer'),
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  handleValidationErrors
];

// Admin validation
const validateSettings = [
  body('avg_service_time')
    .optional()
    .isFloat({ min: 1, max: 60 }).withMessage('Average service time must be between 1 and 60 minutes'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateToken,
  validateTokenNumber,
  validatePagination,
  validateDateRange,
  validateSettings
};