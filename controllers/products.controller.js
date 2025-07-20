const Product = require('../models/Product.model');
const User = require('../models/User.model');
const logger = require('../utils/logger');
const { sendExpiryEmail } = require('../services/email.service');
const ApiFeatures = require('../utils/apiFeatures');

// Helper: Check product expiry
const checkExpiry = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  return {
    isExpired: daysLeft <= 0,
    isExpiringSoon: daysLeft > 0 && daysLeft <= 7,
    daysLeft
  };
};

// Create product with expiry check
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      createdBy: req.user.id
    });

    const expiryStatus = checkExpiry(product.expiryDate);
    
    if (expiryStatus.isExpiringSoon || expiryStatus.isExpired) {
      await sendExpiryEmail({
        product,
        user: req.user,
        daysLeft: expiryStatus.daysLeft
      });
    }

    res.status(201).json({
      success: true,
      data: product,
      expiryStatus
    });

  } catch (err) {
    logger.error(`Product creation failed: ${err.message}`);
    res.status(400).json({
      success: false,
      error: 'Product creation failed'
    });
  }
};

// Get all products with expiry filters
exports.getProducts = async (req, res) => {
  try {
    const features = new ApiFeatures(Product.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const products = await features.query;

    // Add expiry status to each product
    const productsWithExpiry = products.map(product => {
      const expiryStatus = checkExpiry(product.expiryDate);
      return {
        ...product.toObject(),
        expiryStatus
      };
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: productsWithExpiry
    });

  } catch (err) {
    logger.error(`Fetch products failed: ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Scheduled expiry check (run daily via cron)
exports.checkExpiringProducts = async () => {
  try {
    const products = await Product.find();
    const expiringProducts = [];
    
    for (const product of products) {
      const { isExpiringSoon, daysLeft } = checkExpiry(product.expiryDate);
      
      if (isExpiringSoon) {
        const user = await User.findById(product.createdBy);
        await sendExpiryEmail({ product, user, daysLeft });
        expiringProducts.push(product._id);
      }
    }

    logger.info(`Expiry check: ${expiringProducts.length} products need attention`);
    return expiringProducts;

  } catch (err) {
    logger.error(`Expiry check failed: ${err.message}`);
  }
};