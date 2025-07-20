require('dotenv').config({ 
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development'
});
const app = require('./app');
const mongoose = require('mongoose');
const { setupWebSocket } = require('./utils/socketManager');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Database Connection with Retry Logic
const connectDB = async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority'
  };

  let retryAttempts = 0;
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  while (retryAttempts < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, options);
      logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
      return;
    } catch (err) {
      retryAttempts++;
      logger.error(`MongoDB connection failed (attempt ${retryAttempts}): ${err.message}`);
      
      if (retryAttempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        logger.info('Retrying database connection...');
      } else {
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
      }
    }
  }
};

// Graceful shutdown handler
const gracefulShutdown = (server) => {
  return async (signal) => {
    logger.info(`${signal} received: Closing HTTP and DB connections`);
    
    try {
      // Close HTTP server
      await new Promise((resolve) => server.close(resolve));
      
      // Close MongoDB connection
      await mongoose.connection.close(false);
      logger.info('MongoDB connection closed');
      
      process.exit(0);
    } catch (err) {
      logger.error(`Shutdown failed: ${err.message}`);
      process.exit(1);
    }
  };
};

// Start the server
(async () => {
  try {
    // Database Connection
    await connectDB();
    
    // Connection event handlers
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from DB');
    });

    // HTTP Server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on ${HOST}:${PORT}`);
    });

    // WebSocket Setup
    if (process.env.WS_ENABLED === 'true') {
      setupWebSocket(server);
    }

    // Handle shutdown signals
    process.on('SIGTERM', gracefulShutdown(server));
    process.on('SIGINT', gracefulShutdown(server));

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
    });

  } catch (err) {
    logger.error(`Server startup failed: ${err.message}`);
    process.exit(1);
  }
})();