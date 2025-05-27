const express = require('express');
const { body, query, param } = require('express-validator');
const BookingController = require('../controllers/bookingCtrl');
const auth = require('../middlewares/authMid');
const role = require('../middlewares/roleMid');
const { authenticateToken } = require('../middlewares/authMid');
const { requireUser, requireAdmin, requireOwnerOrAdmin, rateLimitByRole } = require('../middlewares/roleMid');
const { bookingValidators } = require('../middlewares/validators');

const BookingRout = express.Router();

BookingRout.post('/', [
  auth,
  body('eventId').isUUID(),
  body('numberOfSeats').isInt({ min: 1, max: 10 }),
  body('specialRequests').optional().trim().isLength({ max: 500 })
], BookingController.createBooking);

BookingRout.get('/', [
  auth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'refunded']),
  query('upcoming').optional().isBoolean()
], BookingController.getUserBookings);

BookingRout.get('/all', [
  auth,
  role(['admin']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'refunded']),
  query('eventId').optional().isUUID(),
  query('userId').optional().isUUID(),
  query('paymentStatus').optional().isIn(['pending', 'completed', 'failed', 'refunded'])
], BookingController.getAllBookings);

BookingRout.get('/stats', [
  auth,
  role(['admin']),
  query('eventId').optional().isUUID()
], BookingController.getBookingStats);

BookingRout.get('/:bookingId', [
  auth,
  param('bookingId').isUUID()
], BookingController.getBookingById);

BookingRout.put('/:bookingId/cancel', [
  auth,
  param('bookingId').isUUID()
], BookingController.cancelBooking);

BookingRout.put('/:bookingId/status', [
  auth,
  role(['admin']),
  param('bookingId').isUUID(),
  body('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'refunded']),
  body('paymentStatus').optional().isIn(['pending', 'completed', 'failed', 'refunded']),
  body('adminNotes').optional().trim().isLength({ max: 1000 })
], BookingController.updateBookingStatus);

BookingRout.get('/reference/:reference', [
  param('reference')
    .isLength({ min: 10, max: 20 })
    .matches(/^BK[0-9A-Z]+$/)
], async (req, res) => {
  try {
    const { reference } = req.params;
    const { Booking, Event, User } = require('../models');

    const booking = await Booking.findOne({
      where: { bookingReference: reference },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Event, as: 'event', attributes: ['id', 'title', 'venue', 'eventDate', 'ticketPrice', 'status'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found with this reference' });
    }

    res.status(200).json({
      success: true,
      message: 'Booking found',
      data: { booking }
    });

  } catch (err) {
    console.error('Reference fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

BookingRout.post('/:bookingId/verify-payment', [
  auth,
  role(['admin']),
  param('bookingId').isUUID(),
  body('paymentId').trim().isLength({ min: 5, max: 100 }),
  body('status').isIn(['success', 'failure']),
  body('amount').isFloat({ min: 0 })
], BookingController.verifyPayment);

module.exports = BookingRout;
