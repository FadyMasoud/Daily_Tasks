const express = require('express');
const { publishDueTasks, sendReminders } = require('../cron/jobs');

const router = express.Router();

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Reject everything else.
function cronAuth(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`)
    return res.status(401).json({ message: 'Unauthorized' });
  next();
}

// GET /api/cron/publish — publish due tasks and email users
router.get('/publish', cronAuth, async (_req, res) => {
  try {
    const published = await publishDueTasks();
    res.json({ published });
  } catch (err) {
    console.error('Publish cron error:', err.message);
    res.status(500).json({ message: 'Publish failed' });
  }
});

// GET /api/cron/reminders — remind users with pending tasks
router.get('/reminders', cronAuth, async (_req, res) => {
  try {
    const reminded = await sendReminders();
    res.json({ reminded });
  } catch (err) {
    console.error('Reminder cron error:', err.message);
    res.status(500).json({ message: 'Reminders failed' });
  }
});

module.exports = router;
