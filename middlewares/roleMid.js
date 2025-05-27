const { Event } = require('../models');

const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Auth required' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access only' });
  }
  next();
};

const userOrAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'User auth required' });
  if (!['user', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Valid user role needed' });
  }
  next();
};

const rolesAllowed = (roles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Auth required' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Allowed roles: ${roles.join(', ')}`
    });
  }
  next();
};

const ownerOrAdmin = (resourceField = 'userId') => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Auth required' });

  if (req.user.role === 'admin') return next();

  const resourceOwnerId = req.params[resourceField] || req.body[resourceField];

  if (req.user.userId === resourceOwnerId) return next();

  return res.status(403).json({
    success: false,
    message: 'Access denied. You only can access your own resources'
  });
};

const canEditEvent = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Auth required' });

  if (req.user.role === 'admin') return next();

  const eventId = req.params.eventId || req.params.id;
  const event = await Event.findByPk(eventId);

  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

  if (event.createdBy !== req.user.userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only modify your own events'
    });
  }

  req.event = event;
  next();
};

const rateLimiter = (limits = { user: 100, admin: 1000 }) => (req, res, next) => {
  const role = req.user?.role || 'anonymous';
  const limit = limits[role] || limits.user || 100;

  req.rateLimit = { role, limit };

  next();
};

module.exports = {
  adminOnly,
  userOrAdmin,
  rolesAllowed,
  ownerOrAdmin,
  canEditEvent,
  rateLimiter
};
