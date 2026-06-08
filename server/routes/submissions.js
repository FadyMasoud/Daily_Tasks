const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/submissions — submit answers
router.post('/', auth, async (req, res) => {
  const { task_id, answers } = req.body;
  if (!task_id || !Array.isArray(answers) || !answers.length)
    return res.status(400).json({ message: 'task_id and answers are required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.execute(
      'SELECT id FROM submissions WHERE user_id = ? AND task_id = ?',
      [req.user.id, task_id]
    );
    if (existing.length)
      return res.status(409).json({ message: 'Already submitted' });

    const [result] = await conn.execute(
      'INSERT INTO submissions (user_id, task_id) VALUES (?, ?)',
      [req.user.id, task_id]
    );
    const submissionId = result.insertId;

    for (const ans of answers) {
      if (!ans.question_id || ans.answer_text === undefined)
        continue;
      await conn.execute(
        'INSERT INTO answers (submission_id, question_id, answer_text) VALUES (?, ?, ?)',
        [submissionId, ans.question_id, ans.answer_text]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Submitted successfully', submission_id: submissionId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// GET /api/submissions/my — user's completed submissions
router.get('/my', auth, async (req, res) => {
  try {
    const [submissions] = await pool.execute(`
      SELECT s.id, s.task_id, s.submitted_at,
             t.title, t.title_ar, t.description, t.description_ar
      FROM submissions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.user_id = ?
      ORDER BY s.submitted_at DESC
    `, [req.user.id]);

    res.json(submissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/submissions/my/:taskId — answers for one completed task
router.get('/my/:taskId', auth, async (req, res) => {
  try {
    const [subs] = await pool.execute(
      'SELECT id FROM submissions WHERE user_id = ? AND task_id = ?',
      [req.user.id, req.params.taskId]
    );
    if (!subs[0]) return res.status(404).json({ message: 'Submission not found' });

    const [answers] = await pool.execute(`
      SELECT a.answer_text, q.question_text, q.question_ar, q.order_index
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.submission_id = ?
      ORDER BY q.order_index ASC
    `, [subs[0].id]);

    res.json({ submission_id: subs[0].id, answers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
