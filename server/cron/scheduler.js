const cron = require('node-cron');
const { publishDueTasks, sendReminders } = require('./jobs');

// Job 1: Publish tasks every minute
cron.schedule('* * * * *', async () => {
  try {
    await publishDueTasks();
  } catch (err) {
    console.error('Publish cron error:', err.message);
  }
});

// Job 2: Send reminders every day at 09:00
cron.schedule('0 9 * * *', async () => {
  try {
    await sendReminders();
  } catch (err) {
    console.error('Reminder cron error:', err.message);
  }
});

console.log('Cron scheduler started');
