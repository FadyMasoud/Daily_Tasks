const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const pool     = require('../db');
const auth     = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

// ── Upload directory ──────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/posts');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `post-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// ── Helpers ───────────────────────────────────────────────────
async function enrichPosts(posts, userId) {
  if (!posts.length) return [];
  const ids = posts.map(p => p.id);
  const placeholders = ids.map(() => '?').join(',');

  const [likes] = await pool.execute(
    `SELECT post_id, COUNT(*) AS cnt FROM post_likes WHERE post_id IN (${placeholders}) GROUP BY post_id`,
    ids
  );
  const [comments] = await pool.execute(
    `SELECT post_id, COUNT(*) AS cnt FROM post_comments WHERE post_id IN (${placeholders}) GROUP BY post_id`,
    ids
  );

  let userLikes = new Set();
  if (userId) {
    const [ul] = await pool.execute(
      `SELECT post_id FROM post_likes WHERE post_id IN (${placeholders}) AND user_id = ?`,
      [...ids, userId]
    );
    userLikes = new Set(ul.map(r => r.post_id));
  }

  const likeMap    = Object.fromEntries(likes.map(r => [r.post_id, Number(r.cnt)]));
  const commentMap = Object.fromEntries(comments.map(r => [r.post_id, Number(r.cnt)]));

  return posts.map(p => ({
    ...p,
    like_count:    likeMap[p.id]    || 0,
    comment_count: commentMap[p.id] || 0,
    liked_by_me:   userLikes.has(p.id),
  }));
}

// ── GET /api/posts  — all posts (newest first) ────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.image_path, p.description, p.created_at, p.updated_at,
              u.username AS author_name
       FROM posts p
       JOIN users u ON u.id = p.admin_id
       ORDER BY p.created_at DESC`
    );
    const enriched = await enrichPosts(rows, req.user.id);
    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/posts  — create (admin) ─────────────────────────
router.post('/', auth, adminOnly, upload.single('image'), async (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ message: 'Description required' });

  const imagePath = req.file ? `/uploads/posts/${req.file.filename}` : null;
  try {
    const [result] = await pool.execute(
      'INSERT INTO posts (admin_id, image_path, description) VALUES (?, ?, ?)',
      [req.user.id, imagePath, description.trim()]
    );
    const [[post]] = await pool.execute(
      `SELECT p.id, p.image_path, p.description, p.created_at, u.username AS author_name
       FROM posts p JOIN users u ON u.id = p.admin_id WHERE p.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ ...post, like_count: 0, comment_count: 0, liked_by_me: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/posts/:id  — edit (admin) ──────────────────────
router.patch('/:id', auth, adminOnly, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  try {
    const [[post]] = await pool.execute('SELECT * FROM posts WHERE id = ?', [id]);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const newDesc      = description?.trim() || post.description;
    let   newImagePath = post.image_path;

    if (req.file) {
      // Delete old image if it exists
      if (post.image_path) {
        const oldFile = path.join(__dirname, '..', post.image_path);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      newImagePath = `/uploads/posts/${req.file.filename}`;
    }

    await pool.execute(
      'UPDATE posts SET description = ?, image_path = ? WHERE id = ?',
      [newDesc, newImagePath, id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/posts/:id  — delete (admin) ───────────────────
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const [[post]] = await pool.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.image_path) {
      const file = path.join(__dirname, '..', post.image_path);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/posts/:id/like  — toggle like ───────────────────
router.post('/:id/like', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [[existing]] = await pool.execute(
      'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (existing) {
      await pool.execute('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [id, req.user.id]);
      res.json({ liked: false });
    } else {
      await pool.execute('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [id, req.user.id]);
      res.json({ liked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/posts/:id/comments ───────────────────────────────
// Supports Facebook-style pagination:
//   ?limit=N            → newest N comments (returned oldest→newest)
//   ?limit=N&before=ID  → the N comments older than comment ID (for "view previous")
// Response: { comments: [...ascending...], total }
// Without `limit`, returns every comment ascending (back-compat for callers that want all).
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const limit  = Math.min(Math.max(parseInt(req.query.limit, 10) || 0, 0), 100);
    const before = parseInt(req.query.before, 10) || 0;

    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM post_comments WHERE post_id = ?',
      [postId]
    );

    let rows;
    if (limit > 0) {
      // Fetch newest-first (cursor by id keeps it stable as new comments arrive),
      // then reverse so the client renders them chronologically.
      const params = [postId];
      let where = 'c.post_id = ?';
      if (before) { where += ' AND c.id < ?'; params.push(before); }
      [rows] = await pool.execute(
        `SELECT c.id, c.comment_text, c.created_at, u.username
         FROM post_comments c JOIN users u ON u.id = c.user_id
         WHERE ${where} ORDER BY c.id DESC LIMIT ${limit}`,
        params
      );
      rows.reverse();
    } else {
      [rows] = await pool.execute(
        `SELECT c.id, c.comment_text, c.created_at, u.username
         FROM post_comments c JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ? ORDER BY c.id ASC`,
        [postId]
      );
    }

    res.json({ comments: rows, total: Number(total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/posts/:id/comments ─────────────────────────────
router.post('/:id/comments', auth, async (req, res) => {
  const { comment_text } = req.body;
  if (!comment_text?.trim()) return res.status(400).json({ message: 'Comment required' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO post_comments (post_id, user_id, comment_text) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, comment_text.trim()]
    );
    const [[comment]] = await pool.execute(
      `SELECT c.id, c.comment_text, c.created_at, u.username
       FROM post_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [result.insertId]
    );
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/posts/comments/:commentId ─────────────────────
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const [[comment]] = await pool.execute(
      'SELECT * FROM post_comments WHERE id = ?',
      [req.params.commentId]
    );
    if (!comment) return res.status(404).json({ message: 'Not found' });
    if (comment.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Forbidden' });

    await pool.execute('DELETE FROM post_comments WHERE id = ?', [req.params.commentId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
