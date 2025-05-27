const { validationResult } = require("express-validator");
const { Booking, Event, User, sequelize } = require("../models");

class BookingCtrl {
  static async make(req, res) {
    const txn = await sequelize.transaction();
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      await txn.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Invalid", errors: errs.array() });
    }
    const { eventId, numberOfSeats, specialRequests } = req.body;
    const uId = req.user.userId;
    const ev = await Event.findByPk(eventId, { lock: true, transaction: txn });
    if (!ev) {
      await txn.rollback();
      return res.status(404).json({ success: false, message: "No event" });
    }
    if (!ev.isBookable()) {
      await txn.rollback();
      return res.status(400).json({ success: false, message: "Cant book" });
    }
    if (!ev.hasAvailableSeats(numberOfSeats)) {
      await txn.rollback();
      return res
        .status(400)
        .json({ success: false, message: `Only ${ev.availableSeats} left` });
    }
    const existing = await Booking.findOne({
      where: { userId: uId, eventId, status: "confirmed" },
      transaction: txn,
    });
    if (existing) {
      await txn.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Already booked" });
    }
    const amt = numberOfSeats * parseFloat(ev.ticketPrice);
    const newB = await Booking.create(
      {
        userId: uId,
        eventId,
        numberOfSeats,
        totalAmount: amt.toFixed(2),
        specialRequests,
        status: "confirmed",
        paymentStatus: "completed",
      },
      { transaction: txn }
    );
    await ev.update(
      { availableSeats: ev.availableSeats - numberOfSeats },
      { transaction: txn }
    );
    await txn.commit();
    const full = await Booking.findByPk(newB.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Event,
          as: "event",
          attributes: ["id", "title", "venue", "eventDate", "ticketPrice"],
        },
      ],
    });
    res
      .status(201)
      .json({ success: true, message: "Booked", data: { booking: full } });
  }
  static async own(req, res) {
    const { page = 1, limit = 10, status, upcoming = false } = req.query;
    const uid = req.user.userId;
    const where = { userId: uid };
    if (status) where.status = status;
    const incl = [
      {
        model: Event,
        as: "event",
        attributes: [
          "id",
          "title",
          "venue",
          "eventDate",
          "status",
          "ticketPrice",
        ],
      },
    ];
    if (upcoming === "true")
      incl[0].where = {
        eventDate: { [require("sequelize").Op.gt]: new Date() },
      };
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: incl,
      order: [["bookedAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });
    const totalPages = Math.ceil(count / limit);
    res
      .status(200)
      .json({
        success: true,
        message: "Got bookings",
        data: {
          bookings,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalBookings: count,
            limit: parseInt(limit),
          },
        },
      });
  }
  static async one(req, res) {
    const { bookingId } = req.params;
    const uid = req.user.userId;
    const one = await Booking.findOne({
      where: {
        id: bookingId,
        ...(req.user.role !== "admin" && { userId: uid }),
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Event,
          as: "event",
          attributes: [
            "id",
            "title",
            "description",
            "venue",
            "eventDate",
            "ticketPrice",
            "status",
          ],
        },
      ],
    });
    if (!one)
      return res
        .status(404)
        .json({ success: false, message: "No such booking" });
    res
      .status(200)
      .json({ success: true, message: "Found", data: { booking: one } });
  }
  static async drop(req, res) {
    const txn = await sequelize.transaction();
    const { bookingId } = req.params;
    const uid = req.user.userId;
    const b = await Booking.findOne({
      where: {
        id: bookingId,
        ...(req.user.role !== "admin" && { userId: uid }),
      },
      include: [{ model: Event, as: "event" }],
      lock: true,
      transaction: txn,
    });
    if (!b) {
      await txn.rollback();
      return res.status(404).json({ success: false, message: "Not found" });
    }
    if (!b.canBeCancelled()) {
      await txn.rollback();
      return res.status(400).json({ success: false, message: "Cannot cancel" });
    }
    const hoursLeft =
      (new Date(b.event.eventDate) - new Date()) / (1000 * 60 * 60);
    if (hoursLeft < 24) {
      await txn.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Too late to cancel" });
    }
    await b.update(
      { status: "cancelled", paymentStatus: "refunded" },
      { transaction: txn }
    );
    await b.event.update(
      { availableSeats: b.event.availableSeats + b.numberOfSeats },
      { transaction: txn }
    );
    await txn.commit();
    res
      .status(200)
      .json({ success: true, message: "Cancelled", data: { booking: b } });
  }
  static async all(req, res) {
    const {
      page = 1,
      limit = 20,
      status,
      eventId,
      userId,
      paymentStatus,
    } = req.query;
    const where = {};
    if (status) where.status = status;
    if (eventId) where.eventId = eventId;
    if (userId) where.userId = userId;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Event,
          as: "event",
          attributes: [
            "id",
            "title",
            "venue",
            "eventDate",
            "ticketPrice",
            "status",
          ],
        },
      ],
      order: [["bookedAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });
    const totalPages = Math.ceil(count / limit);
    res
      .status(200)
      .json({
        success: true,
        message: "All bookings",
        data: {
          bookings,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalBookings: count,
            limit: parseInt(limit),
          },
        },
      });
  }
  static async patch(req, res) {
    const txn = await sequelize.transaction();
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      await txn.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Invalid", errors: errs.array() });
    }
    const { bookingId } = req.params;
    const { status, paymentStatus, adminNotes } = req.body;
    const b = await Booking.findByPk(bookingId, {
      include: [{ model: Event, as: "event" }],
      lock: true,
      transaction: txn,
    });
    if (!b) {
      await txn.rollback();
      return res.status(404).json({ success: false, message: "No such" });
    }
    const update = {};
    if (status) update.status = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    if (adminNotes) update.adminNotes = adminNotes;
    if (b.status === "confirmed" && status === "cancelled")
      await b.event.update(
        { availableSeats: b.event.availableSeats + b.numberOfSeats },
        { transaction: txn }
      );
    if (b.status === "cancelled" && status === "confirmed") {
      if (!b.event.hasAvailableSeats(b.numberOfSeats)) {
        await txn.rollback();
        return res
          .status(400)
          .json({ success: false, message: "Not enough seats" });
      }
      await b.event.update(
        { availableSeats: b.event.availableSeats - b.numberOfSeats },
        { transaction: txn }
      );
    }
    await b.update(update, { transaction: txn });
    await txn.commit();
    const up = await Booking.findByPk(bookingId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Event,
          as: "event",
          attributes: ["id", "title", "venue", "eventDate", "ticketPrice"],
        },
      ],
    });
    res
      .status(200)
      .json({ success: true, message: "Updated", data: { booking: up } });
  }
  static async stats(req, res) {
    const { eventId } = req.query;
    const total = await Booking.count({
      ...(eventId && { where: { eventId } }),
    });
    const confirmed = await Booking.count({
      where: { status: "confirmed", ...(eventId && { eventId }) },
    });
    const cancelled = await Booking.count({
      where: { status: "cancelled", ...(eventId && { eventId }) },
    });
    const rev = await Booking.findOne({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("totalAmount")), "totalRevenue"],
      ],
      where: {
        status: "confirmed",
        paymentStatus: "completed",
        ...(eventId && { eventId }),
      },
    });
    const revenue = parseFloat(rev?.dataValues?.totalRevenue || 0);
    const past = new Date();
    past.setDate(past.getDate() - 7);
    const recent = await Booking.count({
      where: {
        bookedAt: { [sequelize.Op.gte]: past },
        ...(eventId && { eventId }),
      },
    });
    res
      .status(200)
      .json({
        success: true,
        message: "Stats",
        data: {
          totalBookings: total,
          confirmedBookings: confirmed,
          cancelledBookings: cancelled,
          totalRevenue: revenue.toFixed(2),
          recentBookings: recent,
          cancellationRate:
            total > 0 ? ((cancelled / total) * 100).toFixed(2) : 0,
        },
      });
  }
}
module.exports = BookingCtrl;
