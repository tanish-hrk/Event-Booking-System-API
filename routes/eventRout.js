const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMid');
const { requireAdmin, requireUser, canModifyEvent, rateLimitByRole } = require('../middlewares/roleMid');
const { eventValidators } = require('../middlewares/validators');
const EventCtrl = require('../controllers/eventCtrl');
const { body, param, query } = require('express-validator');

const EventRout = express.Router();

EventRout.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['conference','workshop','seminar','concert','sports','other']),
  query('status').optional().isIn(['active','cancelled','completed']),
  query('upcoming').optional().isBoolean(),
  query('available').optional().isBoolean(),
  query('search').optional().trim().isLength({ min: 2, max: 100 })
], EventCtrl.getAllEvents);

EventRout.get('/upcoming', [
  query('limit').optional().isInt({ min: 1, max: 50 })
], EventCtrl.getUpcomingEvents);

EventRout.get('/search', [
  query('q').trim().isLength({ min: 2, max: 100 }),
  query('category').optional().isIn(['conference','workshop','seminar','concert','sports','other'])
], EventCtrl.searchEvents);

EventRout.get('/:eventId', [
  param('eventId').isUUID()
], EventCtrl.getEventById);

EventRout.post('/', [
  auth,
  role(['admin']),
  body('title').trim().isLength({ min: 3, max: 200 }),
  body('description').trim().isLength({ min: 10, max: 2000 }),
  body('venue').trim().isLength({ min: 3, max: 200 }),
  body('eventDate').isISO8601().custom(val => {
    if (new Date(val) <= new Date()) throw new Error('Date must be future');
    return true;
  }),
  body('totalSeats').isInt({ min: 1, max: 50000 }),
  body('ticketPrice').isFloat({ min: 0 }).custom(v => {
    if (!/^\d+(\.\d{1,2})?$/.test(v.toString())) throw new Error('Only 2 decimal places');
    return true;
  }),
  body('category').isIn(['conference','workshop','seminar','concert','sports','other']),
  body('imageUrl').optional().isURL().isLength({ max: 500 })
], EventCtrl.createEvent);

EventRout.put('/:eventId', [
  auth,
  role(['admin']),
  param('eventId').isUUID(),
  body('title').optional().trim().isLength({ min: 3, max: 200 }),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }),
  body('venue').optional().trim().isLength({ min: 3, max: 200 }),
  body('eventDate').optional().isISO8601().custom(val => {
    if (val && new Date(val) <= new Date()) throw new Error('Invalid future date');
    return true;
  }),
  body('totalSeats').optional().isInt({ min: 1, max: 50000 }),
  body('ticketPrice').optional().isFloat({ min: 0 }),
  body('category').optional().isIn(['conference','workshop','seminar','concert','sports','other']),
  body('status').optional().isIn(['active','cancelled','completed']),
  body('imageUrl').optional().isURL().isLength({ max: 500 })
], EventCtrl.updateEvent);

EventRout.delete('/:eventId', [
  auth,
  role(['admin']),
  param('eventId').isUUID()
], EventCtrl.deleteEvent);

EventRout.get('/:eventId/bookings', [
  auth,
  role(['admin']),
  param('eventId').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending','confirmed','cancelled','refunded'])
], EventCtrl.getEventBookings);

EventRout.get('/:eventId/stats', [
  auth,
  role(['admin']),
  param('eventId').isUUID()
], EventCtrl.getEventStats);

module.exports = EventRout;
