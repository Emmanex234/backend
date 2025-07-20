const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const User = require('../models/User.model');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Send expiry alert email
exports.sendExpiryEmail = async ({ product, user, daysLeft }) => {
  try {
    const subject = daysLeft <= 0 
      ? `URGENT: ${product.name} has expired!` 
      : `Warning: ${product.name} expiring in ${daysLeft} days`;

    const html = `
      <h2>Product Expiry Alert</h2>
      <p><strong>Product:</strong> ${product.name}</p>
      <p><strong>Category:</strong> ${product.category}</p>
      <p><strong>Batch:</strong> ${product.batchNumber || 'N/A'}</p>
      <p><strong>Expiry Date:</strong> ${product.expiryDate.toDateString()}</p>
      <p><strong>Status:</strong> ${daysLeft <= 0 ? 'EXPIRED' : `Expires in ${daysLeft} days`}</p>
      <p>Please take appropriate action.</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      cc: process.env.ADMIN_EMAIL,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Expiry alert sent to ${user.email}`);

  } catch (err) {
    logger.error(`Email sending failed: ${err.message}`);
    throw err;
  }
};

// Send daily digest to admin
exports.sendDailyDigest = async (expiringProducts) => {
  if (!expiringProducts.length) return;

  try {
    const html = `
      <h2>Daily Expiry Report</h2>
      <p>${expiringProducts.length} products need attention:</p>
      <ul>
        ${expiringProducts.map(p => `
          <li>
            <strong>${p.name}</strong> (${p.category}) - 
            Expires: ${p.expiryDate.toDateString()}
          </li>
        `).join('')}
      </ul>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `Daily Expiry Alert: ${expiringProducts.length} items`,
      html
    });

  } catch (err) {
    logger.error(`Daily digest failed: ${err.message}`);
  }
};