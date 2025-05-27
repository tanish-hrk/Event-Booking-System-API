const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');

function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
}

const userValidators = {
  register: [
    body('email')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password length should be at least 6 chars'),
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name length must be 2-50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name length must be 2-50 characters'),
    checkValidation
  ],
  signin: [
    body('email')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password cannot be empty'),
    checkValidation
  ]
};

const eventCheckers = {
  add: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Title length must be 3-200 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description length must be 10-2000 characters'),
    body('venue')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Venue length must be 3-200 characters'),
    body('eventDate')
      .isISO8601()
      .withMessage('Date format is invalid')
      .custom(val => {
        if (new Date(val) <= new Date()) throw new Error('Event date must be future');
        return true;
      }),
    body('totalSeats')
      .isInt({ min: 1, max: 50000 })
      .withMessage('Seats must be between 1 and 50000'),
    body('ticketPrice')
      .isFloat({ min: 0 })
      .withMessage('Ticket price must be positive'),
    body('category')
      .isIn(['conference', 'workshop', 'seminar', 'concert', 'sports', 'other'])
      .withMessage('Category not valid'),
    checkValidation
  ],
  modify: [
    param('id')
      .isUUID()
      .withMessage('Invalid event id'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Title length must be 3-200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description length must be 10-2000 characters'),
    body('venue')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Venue length must be 3-200 characters'),
    body('eventDate')
      .optional()
      .isISO8601()
      .withMessage('Date format is invalid')
      .custom(val => {
        if (new Date(val) <= new Date()) throw new Error('Event date must be future');
        return true;
      }),
    body('totalSeats')
      .optional()
      .isInt({ min: 1, max: 50000 })
      .withMessage('Seats must be between 1 and 50000'),
    body('ticketPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Ticket price must be positive'),
    body('category')
      .optional()
      .isIn(['conference', 'workshop', 'seminar', 'concert', 'sports', 'other'])
      .withMessage('Category not valid'),
    checkValidation
  ],
  fetchById: [
    param('id')
      .isUUID()
      .withMessage('Invalid event id'),
    checkValidation
  ],
  fetchAll: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be 1-100'),
    query('category')
      .optional()
      .isIn(['conference', 'workshop', 'seminar', 'concert', 'sports', 'other'])
      .withMessage('Category not valid'),
    checkValidation
  ]
};

const bookingCheckers = {
  addBooking: [
    body('eventId')
      .isUUID()
      .withMessage('Invalid event id'),
    body('seats')
      .isInt({ min: 1, max: 10 })
      .withMessage('Seats must be between 1 and 10'),
    body('specialReq')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Special requests max 500 chars'),
    checkValidation
  ],
  cancelBooking: [
    param('id')
      .isUUID()
      .withMessage('Invalid booking id'),
    checkValidation
  ],
  getBooking: [
    param('id')
      .isUUID()
      .withMessage('Invalid booking id'),
    checkValidation
  ],
  listBookings: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be 1-100'),
    checkValidation
  ]
};

module.exports = {
  userValidators,
  eventCheckers,
  bookingCheckers
};
