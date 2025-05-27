const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Title required" },
        len: { args: [3, 200], msg: "Title length invalid" },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Description required" },
        len: { args: [10, 2000], msg: "Too short" },
      },
    },
    venue: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Venue empty" },
        len: { args: [3, 200], msg: "Venue too short" },
      },
    },
    eventDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: { msg: "Not a date" },
        isFuture(val) {
          if (new Date(val) < new Date()) {
            throw new Error("Date must be in future");
          }
        },
      },
    },
    totalSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: { msg: "Not whole" },
        min: { args: [1], msg: "Minimum 1" },
        max: { args: [50000], msg: "Max is 50k" },
      },
    },
    availableSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: { msg: "Not whole" },
        min: { args: [0], msg: "Cannot be negative" },
      },
    },
    ticketPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: { msg: "Invalid price" },
        min: { args: [0], msg: "Negative not allowed" },
      },
    },
    category: {
      type: DataTypes.ENUM(
        "conference",
        "workshop",
        "seminar",
        "concert",
        "sports",
        "other"
      ),
      allowNull: false,
      defaultValue: "other",
      validate: {
        isIn: {
          args: [
            ["conference", "workshop", "seminar", "concert", "sports", "other"],
          ],
          msg: "Bad category",
        },
      },
    },
    status: {
      type: DataTypes.ENUM("active", "cancelled", "completed"),
      allowNull: false,
      defaultValue: "active",
      validate: {
        isIn: {
          args: [["active", "cancelled", "completed"]],
          msg: "Bad status",
        },
      },
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: { msg: "Bad URL" },
      },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
  },
  {
    tableName: "events",
    indexes: [
      { fields: ["eventDate"] },
      { fields: ["status"] },
      { fields: ["category"] },
      { fields: ["createdBy"] },
      { fields: ["availableSeats"] },
    ],
    scopes: {
      active: { where: { status: "active" } },
      upcoming: {
        where: {
          status: "active",
          eventDate: { [require("sequelize").Op.gt]: new Date() },
        },
      },
      available: {
        where: {
          status: "active",
          availableSeats: { [require("sequelize").Op.gt]: 0 },
          eventDate: { [require("sequelize").Op.gt]: new Date() },
        },
      },
      byCategory: (cat) => ({ where: { category: cat } }),
    },
    hooks: {
      beforeValidate: (e) => {
        if (e.availableSeats > e.totalSeats) {
          e.availableSeats = e.totalSeats;
        }
      },
    },
  }
);

Event.prototype.hasAvailableSeats = function (n = 1) {
  return this.availableSeats >= n && this.status === "active";
};
Event.prototype.isBookable = function () {
  return (
    this.status === "active" &&
    this.availableSeats > 0 &&
    new Date(this.eventDate) > new Date()
  );
};
Event.prototype.getBookedSeats = function () {
  return this.totalSeats - this.availableSeats;
};
Event.prototype.getOccupancyRate = function () {
  return (
    ((this.totalSeats - this.availableSeats) / this.totalSeats) *
    100
  ).toFixed(2);
};

Event.getUpcomingEvents = function (lim = 10) {
  return this.scope("upcoming").findAll({
    limit: lim,
    order: [["eventDate", "ASC"]],
  });
};
Event.searchEvents = function (search) {
  const { Op } = require("sequelize");
  return this.scope("active").findAll({
    where: {
      [Op.or]: [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { venue: { [Op.iLike]: `%${search}%` } },
      ],
    },
  });
};

module.exports = Event;
