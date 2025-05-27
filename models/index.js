const { sequelize } = require("../config/db");

const User = require("./user");
const Event = require("./event");
const Booking = require("./booking");

User.hasMany(Event, {
  foreignKey: "createdBy",
  as: "createdEvents",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

User.hasMany(Booking, {
  foreignKey: "userId",
  as: "bookings",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Event.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

Event.hasMany(Booking, {
  foreignKey: "eventId",
  as: "bookings",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Booking.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Booking.belongsTo(Event, {
  foreignKey: "eventId",
  as: "event",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

User.belongsToMany(Event, {
  through: Booking,
  foreignKey: "userId",
  otherKey: "eventId",
  as: "bookedEvents",
});

Event.belongsToMany(User, {
  through: Booking,
  foreignKey: "eventId",
  otherKey: "userId",
  as: "attendees",
});

const syncDb = async (force = false) => {
  await sequelize.sync({
    force,
    alter: process.env.NODE_ENV === "development",
  });
  console.log("db synced");
};

module.exports = {
  sequelize,
  User,
  Event,
  Booking,
  syncDb,
};
