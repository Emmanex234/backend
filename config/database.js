const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT),
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT)
  });

  logger.info(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });
};

module.exports = { connectDB };