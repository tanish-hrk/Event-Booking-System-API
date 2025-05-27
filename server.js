require('dotenv').config();
const app = require('./app');
const { sequelize, checkDb } = require('./config/db');

const PORT = process.env.PORT || 3000;

checkDb();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
