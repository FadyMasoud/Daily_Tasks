const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { parseQuestionsFromExcel } = require('../utils/excelParser');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, fileFilter: (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, ext === '.xlsx' || ext === '.xls');
}});

// Compute lock status for a user on a list of tasks
async function attachLockStatus(tasks, userId) {
  if (!userId) return tasks.map(t => ({ ...t, locked: false }));

  const [subs] = await pool.execute(
    'SELECT task_id FROM submissions WHERE user_id = ?', [userId]
  );
  const submittedIds = new Set(subs.map(s => s.task_id));

  return tasks.map((task, idx) => {
    if (!task.requires_previous || idx === 0) return { ...task, locked: false };
    const prevTask = tasks[idx - 1];
    return { ...task, locked: !submittedIds.has(prevTask.id) };
  });
}

// GET /api/tasks — published tasks with user submission status
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const query = isAdmin
      ? 'SELECT t.*, (SELECT COUNT(*) FROM questions q WHERE q.task_id = t.id) as question_count FROM tasks t ORDER BY t.created_at ASC'
      : 'SELECT t.*, (SELECT COUNT(*) FROM questions q WHERE q.task_id = t.id) as question_count FROM tasks t WHERE t.is_published = 1 ORDER BY t.created_at ASC';

    const [tasks] = await pool.execute(query);

    const [subs] = await pool.execute(
      'SELECT task_id FROM submissions WHERE user_id = ?', [userId]
    );
    const submittedIds = new Set(subs.map(s => s.task_id));

    const withStatus = tasks.map(t => ({
      ...t,
      submitted: submittedIds.has(t.id),
    }));

    const withLock = await attachLockStatus(withStatus, userId);
    res.json(withLock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/template — download Excel question template (admin)
router.get('/template', auth, adminOnly, (req, res) => {
  const XLSX = require('xlsx');

  const rows = [
    // Row 1 = topic (skipped by parser). Col A = Arabic, Col B = English (optional)
    ['اكتب موضوع المهمة هنا', ''],
    ['ماذا تعلمت اليوم؟', 'What did you learn today?'],
    ['ما هو أكبر تحدٍّ واجهته؟', 'What was your biggest challenge?'],
    ['ما الذي تشعر بالامتنان له؟', 'What are you grateful for?'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Style header row width
  ws['!cols'] = [{ wch: 40 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="questions-template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// GET /api/tasks/:id/questions-excel — download existing questions as Excel (admin)
router.get('/:id/questions-excel', auth, adminOnly, async (req, res) => {
  const XLSX = require('xlsx');
  try {
    const [taskRows] = await pool.execute('SELECT title, title_ar FROM tasks WHERE id = ?', [req.params.id]);
    if (!taskRows[0]) return res.status(404).json({ message: 'Task not found' });

    const [questions] = await pool.execute(
      'SELECT question_text, question_ar FROM questions WHERE task_id = ? ORDER BY order_index ASC',
      [req.params.id]
    );

    const rows = [
      ['Question (English)', 'Question (Arabic)'],
      ...questions.map(q => [q.question_text || '', q.question_ar || '']),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 45 }, { wch: 45 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const safeName = (taskRows[0].title_ar || taskRows[0].title || 'task').replace(/[^a-zA-Z0-9؀-ۿ]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-questions.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/:id — single task with questions
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Task not found' });
    const task = rows[0];

    if (!task.is_published && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Task not available' });

    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE task_id = ? ORDER BY order_index ASC', [task.id]
    );

    res.json({ ...task, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks — create task (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { title, title_ar, description, description_ar, requires_previous = 0, auto_schedule = 0, scheduled_at } = req.body;
  if (!title_ar) return res.status(400).json({ message: 'اسم المهمة (عربي) مطلوب' });

  try {
    const [result] = await pool.execute(
      `INSERT INTO tasks (title, title_ar, description, description_ar, requires_previous, auto_schedule, scheduled_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title || title_ar, title_ar, description || null, description_ar || null,
       requires_previous ? 1 : 0, auto_schedule ? 1 : 0,
       scheduled_at || null, req.user.id]
    );
    const [newTask] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(newTask[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks/upload-questions/:taskId — upload Excel (admin)
router.post('/upload-questions/:taskId', auth, adminOnly, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const questions = parseQuestionsFromExcel(req.file.path);
    if (!questions.length) return res.status(400).json({ message: 'No questions found in file' });

    await pool.execute('DELETE FROM questions WHERE task_id = ?', [req.params.taskId]);
    for (const q of questions) {
      await pool.execute(
        'INSERT INTO questions (task_id, question_text, question_ar, order_index) VALUES (?, ?, ?, ?)',
        [req.params.taskId, q.question_text, q.question_ar, q.order_index]
      );
    }
    fs.unlinkSync(req.file.path);
    res.json({ message: 'Questions uploaded', count: questions.length, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks/save-questions/:taskId — save questions from manual input (admin)
router.post('/save-questions/:taskId', auth, adminOnly, async (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || !questions.length)
    return res.status(400).json({ message: 'No questions provided' });

  try {
    await pool.execute('DELETE FROM questions WHERE task_id = ?', [req.params.taskId]);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await pool.execute(
        'INSERT INTO questions (task_id, question_text, question_ar, order_index) VALUES (?, ?, ?, ?)',
        [req.params.taskId, q.question_text || '', q.question_ar || '', i]
      );
    }
    res.json({ message: 'Questions saved', count: questions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks/parse-preview — parse Excel without saving (admin)
router.post('/parse-preview', auth, adminOnly, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    const questions = parseQuestionsFromExcel(req.file.path);
    fs.unlinkSync(req.file.path);
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to parse file' });
  }
});

// PATCH /api/tasks/:id — update task (admin)
router.patch('/:id', auth, adminOnly, async (req, res) => {
  const { requires_previous, scheduled_at, auto_schedule, is_published, title, title_ar, description, description_ar } = req.body;

  try {
    const fields = [];
    const values = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (title_ar !== undefined) { fields.push('title_ar = ?'); values.push(title_ar); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (description_ar !== undefined) { fields.push('description_ar = ?'); values.push(description_ar); }
    if (requires_previous !== undefined) { fields.push('requires_previous = ?'); values.push(requires_previous ? 1 : 0); }
    if (scheduled_at !== undefined) { fields.push('scheduled_at = ?'); values.push(scheduled_at); }
    if (auto_schedule !== undefined) { fields.push('auto_schedule = ?'); values.push(auto_schedule ? 1 : 0); }
    if (is_published !== undefined) { fields.push('is_published = ?'); values.push(is_published ? 1 : 0); }

    if (!fields.length) return res.status(400).json({ message: 'No fields to update' });

    values.push(req.params.id);
    await pool.execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    const [updated] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/tasks/:id (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
