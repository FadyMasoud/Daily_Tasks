const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const SALT_ROUNDS = 12;

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

// GET /api/admin/users — list all users (no password)
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, role, language, active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/users — create a new user (used to add admins)
router.post('/users', auth, adminOnly, async (req, res) => {
  const { username, email, password, role = 'admin', language = 'en' } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'username, email and password are required' });
  if (!['admin', 'user'].includes(role))
    return res.status(400).json({ message: 'Invalid role' });

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, role, language, active) VALUES (?, ?, ?, ?, ?, 1)',
      [username, email, hash, role, language]
    );
    const [[user]] = await pool.execute(
      'SELECT id, username, email, role, language, active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Username or email already exists' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/users/:id — update user (active, role, profile, password)
router.patch('/users/:id', auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const isSelf = id === Number(req.user.id);
  const { username, email, role, language, active, password } = req.body;

  // Guard against self-lockout
  if (isSelf && active !== undefined && !active)
    return res.status(400).json({ message: 'You cannot deactivate your own account' });
  if (isSelf && role !== undefined && role !== 'admin')
    return res.status(400).json({ message: 'You cannot change your own role' });
  if (role !== undefined && !['admin', 'user'].includes(role))
    return res.status(400).json({ message: 'Invalid role' });

  try {
    const fields = [];
    const values = [];
    if (username !== undefined) { fields.push('username = ?'); values.push(username); }
    if (email    !== undefined) { fields.push('email = ?');    values.push(email); }
    if (role     !== undefined) { fields.push('role = ?');     values.push(role); }
    if (language !== undefined) { fields.push('language = ?'); values.push(language); }
    if (active   !== undefined) { fields.push('active = ?');   values.push(active ? 1 : 0); }
    if (password) { fields.push('password_hash = ?'); values.push(await bcrypt.hash(password, SALT_ROUNDS)); }

    if (!fields.length) return res.status(400).json({ message: 'No fields to update' });

    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    const [[user]] = await pool.execute(
      'SELECT id, username, email, role, language, active, created_at FROM users WHERE id = ?',
      [id]
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Username or email already exists' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (id === Number(req.user.id))
    return res.status(400).json({ message: 'You cannot delete your own account' });
  try {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
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
