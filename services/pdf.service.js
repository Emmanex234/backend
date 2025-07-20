const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

exports.generateExpiryReport = async (products) => {
  try {
    // Create a new PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    
    // Add title
    page.drawText('Product Expiry Report', {
      x: 50,
      y: height - 50,
      size: 20,
      color: rgb(0, 0, 0)
    });

    // Add generation date
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: height - 80,
      size: 12,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Add product table
    let yPosition = height - 120;
    products.forEach((product, index) => {
      const expiryDate = new Date(product.expiryDate);
      const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
      
      const rowColor = daysLeft <= 0 ? rgb(1, 0, 0) : 
                      daysLeft <= 7 ? rgb(1, 0.5, 0) : 
                      rgb(0, 0, 0);

      page.drawText(`${index + 1}. ${product.name}`, {
        x: 50,
        y: yPosition,
        size: 12,
        color: rowColor
      });

      page.drawText(`Expires: ${expiryDate.toDateString()} (${daysLeft}d)`, {
        x: 300,
        y: yPosition,
        size: 12,
        color: rowColor
      });

      yPosition -= 25;
    });

    // Save PDF to buffer
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (err) {
    logger.error(`PDF generation failed: ${err.message}`);
    throw err;
  }
};