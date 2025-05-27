const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "event_booking_db",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "password",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV == "development" ? console.log : false,
    dialectOptions:
      process.env.NODE_ENV === "production"
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : {},
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  }
);

const checkDb = () => {
  sequelize.authenticate().then(() => {
    console.log("db works");
  });
};

module.exports = { sequelize, checkDb };
