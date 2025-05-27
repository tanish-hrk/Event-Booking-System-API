const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: "First name required" },
        len: { args: [2, 50], msg: "First name length invalid" },
      },
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Last name required" },
        len: { args: [2, 50], msg: "Last name length invalid" },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: "Email in use" },
      validate: {
        isEmail: { msg: "Invalid email" },
        notEmpty: { msg: "Email is empty" },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Password empty" },
        len: { args: [6, 255], msg: "Password too short" },
      },
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
      validate: {
        isIn: { args: [["user", "admin"]], msg: "Invalid role" },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    indexes: [
      { unique: true, fields: ["email"] },
      { fields: ["role"] },
      { fields: ["isActive"] },
    ],
    defaultScope: {
      attributes: { exclude: ["password"] },
    },
    scopes: {
      withPassword: { attributes: {} },
      activeUsers: { where: { isActive: true } },
      admins: { where: { role: "admin" } },
    },
  }
);

User.prototype.getFullName = function () {
  return this.firstName + " " + this.lastName;
};

User.prototype.isAdmin = function () {
  return this.role === "admin";
};

User.findByEmail = function (email) {
  return this.scope("withPassword").findOne({
    where: { email: email.toLowerCase() },
  });
};

module.exports = User;
