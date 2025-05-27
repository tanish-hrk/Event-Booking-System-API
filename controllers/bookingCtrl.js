const { validationResult } = require("express-validator")
const { Booking, Event, User, sequelize } = require("../models")
const { Op } = require("sequelize")

class BookingCtrl {
  static async create(req, res) {
    const tx = await sequelize.transaction()
    const body = req.body
    const uid = req.user.userId

    const evt = await Event.findByPk(body.eventId, {
      lock: tx.LOCK.UPDATE,
      transaction: tx,
    })
    if (!evt) {
      await tx.rollback()
      return res.status(404).json({ success: false, message: "Not found" })
    }
    if (!evt.isBookable()) {
      await tx.rollback()
      return res.status(400).json({ success: false, message: "Not bookable" })
    }
    if (!evt.hasAvailableSeats(body.seats)) {
      await tx.rollback()
      return res.status(400).json({ success: false, message: "Seats issue" })
    }
    const amt = evt.ticketPrice * body.seats
    const book = await Booking.create({
      user_id: uid,
      event_id: body.eventId,
      seats: body.seats,
      amount: amt,
      special_req: body.specialReq,
      status: "confirmed",
      payment_stat: "completed",
    }, { transaction: tx })

    await evt.update({
      availableSeats: evt.availableSeats - body.seats
    }, { transaction: tx })

    await tx.commit()

    const data = await Booking.findByPk(book.id, {
      include: [{
        model: Event,
        attributes: ["title", "venue", "eventDate"]
      }]
    })

    res.status(201).json({ success: true, message: "Booked", data: { booking: data } })
  }

  static async cancel(req, res) {
    const tx = await sequelize.transaction()
    const bk = await Booking.findByPk(req.params.id, {
      include: [{
        model: Event,
        attributes: ["id", "availableSeats"]
      }],
      transaction: tx
    })

    if (!bk) {
      await tx.rollback()
      return res.status(404).json({ success: false, message: "No booking" })
    }

    if (bk.user_id !== req.user.userId && req.user.role !== "admin") {
      await tx.rollback()
      return res.status(403).json({ success: false, message: "Not yours" })
    }

    if (!bk.canCancel()) {
      await tx.rollback()
      return res.status(400).json({ success: false, message: "Can't cancel" })
    }

    await bk.update({ status: "cancelled", cancelled_on: new Date() }, { transaction: tx })
    await bk.Event.update({ availableSeats: bk.Event.availableSeats + bk.seats }, { transaction: tx })
    await tx.commit()
    res.json({ success: true, message: "Cancelled", data: { booking: bk } })
  }

  static async getById(req, res) {
    const b = await Booking.findByPk(req.params.id, {
      include: [
        { model: Event, attributes: ["title", "venue", "eventDate", "ticketPrice"] },
        { model: User, attributes: ["firstName", "lastName", "email"] }
      ]
    })
    if (!b) return res.status(404).json({ success: false, message: "Not found" })
    if (b.user_id !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not yours" })
    }
    res.json({ success: true, data: { booking: b } })
  }

  static async listUserBookings(req, res) {
    let p = parseInt(req.query.page) || 1
    let l = parseInt(req.query.limit) || 10
    let off = (p - 1) * l
    const { count, rows } = await Booking.findAndCountAll({
      where: { user_id: req.user.userId },
      limit: l,
      offset: off,
      order: [["booked_on", "DESC"]],
      include: [{ model: Event, attributes: ["title", "venue", "eventDate"] }]
    })
    res.json({
      success: true,
      data: {
        bookings: rows,
        pagination: {
          total: count,
          page: p,
          limit: l,
          pages: Math.ceil(count / l)
        }
      }
    })
  }

  static async stats(req, res) {
    const { eventId } = req.query
    const base = eventId ? { eventId } : {}
    const total = await Booking.count({ where: base })
    const confirmed = await Booking.count({ where: { status: "confirmed", ...base } })
    const cancelled = await Booking.count({ where: { status: "cancelled", ...base } })
    const rev = await Booking.findOne({
      attributes: [[sequelize.fn("SUM", sequelize.col("totalAmount")), "total"]],
      where: { status: "confirmed", paymentStatus: "completed", ...base }
    })
    const recent = await Booking.count({
      where: { bookedAt: { [Op.gte]: new Date(Date.now() - 7 * 864e5) }, ...base }
    })
    res.status(200).json({
      success: true,
      message: "Stats",
      data: {
        totalBookings: total,
        confirmedBookings: confirmed,
        cancelledBookings: cancelled,
        totalRevenue: parseFloat(rev?.dataValues?.total || 0).toFixed(2),
        recentBookings: recent,
        cancellationRate: total ? ((cancelled / total) * 100).toFixed(2) : 0
      }
    })
  }
}

module.exports = BookingCtrl
