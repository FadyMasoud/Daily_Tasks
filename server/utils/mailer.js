const { Resend } = require('resend');
const pool = require('../db');

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not set — emails will be skipped (logged as failed).');
}
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function sendNewTaskEmail(user, task) {
  const isAr = user.language === 'ar';
  const title = isAr && task.title_ar ? task.title_ar : task.title;
  const subject = isAr ? `مهمة جديدة: ${title}` : `New Task Available: ${title}`;
  const html = isAr
    ? `<div dir="rtl"><h2>مهمة جديدة متاحة</h2><p>مرحباً ${user.username}،</p><p>تم نشر مهمة جديدة: <strong>${title}</strong></p><p><a href="${APP_URL}/user/tasks">اضغط هنا للبدء</a></p></div>`
    : `<h2>New Task Available</h2><p>Hello ${user.username},</p><p>A new task has been published: <strong>${title}</strong></p><p><a href="${APP_URL}/user/tasks">Click here to start</a></p>`;

  let status = 'sent';
  if (!resend) {
    status = 'failed';
  } else {
    try {
      await resend.emails.send({
        from: 'Daily Tasks <onboarding@resend.dev>',
        to: user.email,
        subject,
        html,
      });
    } catch (err) {
      console.error('sendNewTaskEmail error:', err.message);
      status = 'failed';
    }
  }

  try {
    await pool.execute(
      'INSERT INTO email_log (user_id, task_id, type, status) VALUES (?, ?, ?, ?)',
      [user.id, task.id, 'new_task', status]
    );
  } catch (logErr) {
    console.error('email_log insert error:', logErr.message);
  }
}

async function sendReminderEmail(user, pendingTasks) {
  const isAr = user.language === 'ar';
  const taskList = pendingTasks
    .map(t => `<li>${isAr && t.title_ar ? t.title_ar : t.title}</li>`)
    .join('');

  const subject = isAr ? 'تذكير: لديك مهام معلقة' : 'Reminder: You have pending tasks';
  const html = isAr
    ? `<div dir="rtl"><h2>تذكير بالمهام المعلقة</h2><p>مرحباً ${user.username}،</p><p>لديك المهام التالية التي لم تكتملها بعد:</p><ul>${taskList}</ul><p><a href="${APP_URL}/user/tasks">اضغط هنا للبدء</a></p></div>`
    : `<h2>Pending Tasks Reminder</h2><p>Hello ${user.username},</p><p>You have the following tasks pending:</p><ul>${taskList}</ul><p><a href="${APP_URL}/user/tasks">Click here to complete them</a></p>`;

  let status = 'sent';
  if (!resend) {
    status = 'failed';
  } else {
    try {
      await resend.emails.send({
        from: 'Daily Tasks <onboarding@resend.dev>',
        to: user.email,
        subject,
        html,
      });
    } catch (err) {
      console.error('sendReminderEmail error:', err.message);
      status = 'failed';
    }
  }

  try {
    await pool.execute(
      'INSERT INTO email_log (user_id, task_id, type, status) VALUES (?, NULL, ?, ?)',
      [user.id, 'reminder', status]
    );
  } catch (logErr) {
    console.error('email_log insert error:', logErr.message);
  }
}

module.exports = { sendNewTaskEmail, sendReminderEmail };
