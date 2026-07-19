const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

// GET /api/admin/submissions — paginated with filters (username, task_id, date)
router.get('/submissions', auth, adminOnly, async (req, res) => {
  const { user_id, task_id, username, date, page = 1, limit = 20 } = req.query;
  const safeLimit  = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage   = Math.max(parseInt(page, 10) || 1, 1);
  const offset     = (safePage - 1) * safeLimit;

  const conditions = [];
  const values = [];

  if (user_id)  { conditions.push('s.user_id = ?'); values.push(user_id); }
  if (task_id)  { conditions.push('s.task_id = ?'); values.push(task_id); }
  if (username) { conditions.push('u.username LIKE ?'); values.push(`%${username}%`); }
  if (date)     { conditions.push('DATE(s.submitted_at) = ?'); values.push(date); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM submissions s
       JOIN users u ON s.user_id = u.id
       JOIN tasks t ON s.task_id = t.id ${where}`,
      values
    );

    const [rows] = await pool.execute(
      `SELECT s.id as submission_id, s.submitted_at,
              u.id as user_id, u.username, u.email,
              t.id as task_id, t.title, t.title_ar
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       JOIN tasks t ON s.task_id = t.id
       ${where}
       ORDER BY s.submitted_at DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      values
    );

    const withAnswers = await Promise.all(rows.map(async row => {
      const [answers] = await pool.execute(
        `SELECT a.answer_text, q.question_text, q.question_ar, q.order_index
         FROM answers a JOIN questions q ON a.question_id = q.id
         WHERE a.submission_id = ? ORDER BY q.order_index ASC`,
        [row.submission_id]
      );
      return { ...row, answers };
    }));

    res.json({
      data: withAnswers,
      total: parseInt(total),
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/submission-detail/:taskId/:userId
router.get('/submission-detail/:taskId/:userId', auth, adminOnly, async (req, res) => {
  const { taskId, userId } = req.params;
  try {
    const [taskRows] = await pool.execute('SELECT id, title, title_ar, description, description_ar FROM tasks WHERE id = ?', [taskId]);
    if (!taskRows[0]) return res.status(404).json({ message: 'Task not found' });

    const [userRows] = await pool.execute('SELECT id, username, email FROM users WHERE id = ?', [userId]);
    if (!userRows[0]) return res.status(404).json({ message: 'User not found' });

    const [subRows] = await pool.execute(
      'SELECT id, submitted_at FROM submissions WHERE task_id = ? AND user_id = ?',
      [taskId, userId]
    );
    if (!subRows[0]) return res.status(404).json({ message: 'Submission not found' });

    const [answers] = await pool.execute(
      `SELECT a.answer_text, q.question_text, q.question_ar, q.order_index
       FROM answers a JOIN questions q ON a.question_id = q.id
       WHERE a.submission_id = ? ORDER BY q.order_index ASC`,
      [subRows[0].id]
    );

    res.json({
      task: taskRows[0],
      user: userRows[0],
      submission: subRows[0],
      answers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, role, language, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/tasks
router.get('/tasks', auth, adminOnly, async (req, res) => {
  try {
    const [tasks] = await pool.execute('SELECT id, title, title_ar FROM tasks ORDER BY created_at DESC');
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
