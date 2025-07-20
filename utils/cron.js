const cron = require('cron');
const { checkExpiringProducts } = require('../controllers/products.controller');
const { sendDailyDigest } = require('../services/email.service');

// Run daily at 9 AM
new cron.CronJob(
  '0 9 * * *',
  async () => {
    try {
      const expiringProducts = await checkExpiringProducts();
      await sendDailyDigest(expiringProducts);
    } catch (err) {
      console.error('Cron job failed:', err);
    }
  },
  null,
  true,
  'America/Los_Angeles'
);