const express = require('express');
const router = express.Router();

// Import all routes
const authRoutes = require('./auth.routes');
const productRoutes = require('./products.routes');
const chatRoutes = require('./chat.routes');
const notificationRoutes = require('./notifications.routes');

// API Routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;