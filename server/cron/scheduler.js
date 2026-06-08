const cron = require('node-cron');
const pool = require('../db');
const { sendNewTaskEmail, sendReminderEmail } = require('../utils/mailer');

// Job 1: Publish tasks every minute
cron.schedule('* * * * *', async () => {
  try {
    const [tasks] = await pool.execute(`
      SELECT * FROM tasks
      WHERE is_published = 0
        AND (
          (auto_schedule = 1 AND DATE(scheduled_at) = CURDATE())
          OR
          (auto_schedule = 0 AND scheduled_at <= NOW())
        )
    `);

    for (const task of tasks) {
      await pool.execute('UPDATE tasks SET is_published = 1 WHERE id = ?', [task.id]);

      const [users] = await pool.execute("SELECT * FROM users WHERE role = 'user'");
      for (const user of users) {
        await sendNewTaskEmail(user, task);
      }
    }
  } catch (err) {
    console.error('Publish cron error:', err.message);
  }
});

// Job 2: Send reminders every day at 09:00
cron.schedule('0 9 * * *', async () => {
  try {
    const [users] = await pool.execute(`
      SELECT DISTINCT u.* FROM users u
      WHERE u.role = 'user'
        AND EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.is_published = 1
            AND NOT EXISTS (
              SELECT 1 FROM submissions s
              WHERE s.user_id = u.id AND s.task_id = t.id
            )
        )
    `);

    for (const user of users) {
      const [pendingTasks] = await pool.execute(`
        SELECT t.id, t.title, t.title_ar FROM tasks t
        WHERE t.is_published = 1
          AND NOT EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.user_id = ? AND s.task_id = t.id
          )
      `, [user.id]);

      if (pendingTasks.length > 0) {
        await sendReminderEmail(user, pendingTasks);
        await pool.execute('UPDATE users SET updated_at = NOW() WHERE id = ?', [user.id]);
      }
    }
  } catch (err) {
    console.error('Reminder cron error:', err.message);
  }
});

console.log('Cron scheduler started');
