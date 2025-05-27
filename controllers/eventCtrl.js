const { validationResult } = require("express-validator");
const { Event, User, Booking, sequelize } = require("../models");
const { Op } = require('sequelize');

class EventCtrl {
  static async addEvent(req, res) {
    const errs = validationResult(req);
    if (!errs.isEmpty())
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errs.array(),
      });

    const {
      title,
      description,
      venue,
      eventDate,
      totalSeats,
      ticketPrice,
      category,
      imageUrl,
    } = req.body;

    const newEvt = await Event.create({
      title,
      description,
      venue,
      eventDate,
      totalSeats,
      availableSeats: totalSeats,
      ticketPrice,
      category,
      imageUrl,
      createdBy: req.user.userId,
    });

    const fullEvt = await Event.findByPk(newEvt.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Event created",
      data: { event: fullEvt },
    });
  }

  static async fetchEvents(req, res) {
    const {
      page = 1,
      limit = 10,
      category,
      status = "active",
      search,
      sortBy = "eventDate",
      sortOrder = "ASC",
    } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;

    if (search) {
      const { Op } = require("sequelize");
      filter[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { venue: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Event.findAndCountAll({
      where: filter,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      message: "Events fetched",
      data: {
        events: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalEvents: count,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit: parseInt(limit),
        },
      },
    });
  }

  static async getEvent(req, res) {
    const { id } = req.params;

    const evt = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Booking,
          as: "bookings",
          where: { status: "confirmed" },
          required: false,
          attributes: ["id", "numberOfSeats", "bookedAt"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["firstName", "lastName"],
            },
          ],
        },
      ],
    });

    if (!evt)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    const data = evt.toJSON();
    data.bookedSeats = evt.totalSeats - evt.availableSeats;
    data.occupancyRate = ((data.bookedSeats / evt.totalSeats) * 100).toFixed(2);
    data.isBookable = evt.isBookable();

    res
      .status(200)
      .json({ success: true, message: "Event fetched", data: { event: data } });
  }

  static async modifyEvent(req, res) {
    const errs = validationResult(req);
    if (!errs.isEmpty())
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errs.array(),
      });

    const { id } = req.params;
    const updates = req.body;

    const evt = await Event.findByPk(id);
    if (!evt)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    if (req.user.role !== "admin" && evt.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (
      updates.totalSeats &&
      updates.totalSeats < evt.totalSeats - evt.availableSeats
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot reduce seats below booked",
      });
    }

    if (updates.totalSeats) {
      const booked = evt.totalSeats - evt.availableSeats;
      updates.availableSeats = updates.totalSeats - booked;
    }

    await evt.update(updates);

    const updatedEvt = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: "Event updated",
      data: { event: updatedEvt },
    });
  }

  static async removeEvent(req, res) {
    const { id } = req.params;

    const evt = await Event.findByPk(id, {
      include: [
        {
          model: Booking,
          as: "bookings",
          where: { status: "confirmed" },
          required: false,
        },
      ],
    });

    if (!evt)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    if (req.user.role !== "admin" && evt.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (evt.bookings && evt.bookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Event has confirmed bookings, cannot delete",
      });
    }

    await evt.destroy();

    res.status(200).json({ success: true, message: "Event deleted" });
  }

  static async cancelEvent(req, res) {
    const { id } = req.params;

    const evt = await Event.findByPk(id);
    if (!evt)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    if (req.user.role !== "admin" && evt.createdBy !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (evt.status === "cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Already cancelled" });
    }

    await evt.update({ status: "cancelled" });

    await Booking.update(
      { status: "cancelled", cancelledAt: new Date() },
      { where: { eventId: id, status: "confirmed" } }
    );

    res
      .status(200)
      .json({ success: true, message: "Event cancelled and bookings updated" });
  }

  static async getUserEvents(req, res) {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { createdBy: req.user.userId };
    if (status) filter.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Event.findAndCountAll({
      where: filter,
      include: [
        {
          model: Booking,
          as: "bookings",
          attributes: ["id", "numberOfSeats", "status"],
          where: { status: "confirmed" },
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      message: "User events fetched",
      data: {
        events: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalEvents: count,
          limit: parseInt(limit),
        },
      },
    });
  }

  static async getStats(req, res) {
    const { id } = req.params;

    const evt = await Event.findByPk(id, {
      include: [
        {
          model: Booking,
          as: "bookings",
          attributes: ["status", "numberOfSeats", "totalAmount", "bookedAt"],
        },
      ],
    });

    if (!evt)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    const confBookings = evt.bookings.filter((b) => b.status === "confirmed");
    const cancBookings = evt.bookings.filter((b) => b.status === "cancelled");

    const rev = confBookings.reduce(
      (acc, b) => acc + parseFloat(b.totalAmount),
      0
    );
    const seatsBooked = confBookings.reduce(
      (acc, b) => acc + b.numberOfSeats,
      0
    );

    const stats = {
      eventInfo: {
        id: evt.id,
        title: evt.title,
        totalSeats: evt.totalSeats,
        availableSeats: evt.availableSeats,
      },
      bookingStats: {
        totalBookings: evt.bookings.length,
        confirmedBookings: confBookings.length,
        cancelledBookings: cancBookings.length,
        totalSeatsBooked: seatsBooked,
        occupancyRate: ((seatsBooked / evt.totalSeats) * 100).toFixed(2),
      },
      financialStats: {
        totalRevenue: rev.toFixed(2),
        averageBookingValue: confBookings.length
          ? (rev / confBookings.length).toFixed(2)
          : "0.00",
      },
    };

    res.status(200).json({
      success: true,
      message: "Stats fetched",
      data: { stats },
    });
  }

  static async list(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        status,
        upcoming,
        available,
        search,
        minPrice,
        maxPrice,
        startDate,
        endDate,
        sortBy = 'eventDate',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (category) {
        where.category = category;
      }

      if (status) {
        where.status = status;
      }

      if (upcoming === 'true') {
        where.eventDate = {
          [Op.gt]: new Date()
        };
      }

      if (available === 'true') {
        where.availableSeats = {
          [Op.gt]: 0
        };
      }

      if (minPrice || maxPrice) {
        where.ticketPrice = {};
        if (minPrice) where.ticketPrice[Op.gte] = parseFloat(minPrice);
        if (maxPrice) where.ticketPrice[Op.lte] = parseFloat(maxPrice);
      }

      if (startDate || endDate) {
        where.eventDate = {};
        if (startDate) where.eventDate[Op.gte] = new Date(startDate);
        if (endDate) where.eventDate[Op.lte] = new Date(endDate);
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { venue: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const allowedSortFields = ['eventDate', 'ticketPrice', 'createdAt', 'title'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'eventDate';
      const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const { count, rows: events } = await Event.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortField, order]],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.status(200).json({
        success: true,
        data: {
          events,
          pagination: {
            total: count,
            totalPages,
            currentPage: parseInt(page),
            limit: parseInt(limit),
            hasNextPage,
            hasPrevPage
          }
        }
      });
    } catch (error) {
      console.error('Error in list events:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching events',
        error: error.message
      });
    }
  }
}

module.exports = EventCtrl;
