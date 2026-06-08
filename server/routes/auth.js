const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, role = 'user', language = 'en' } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'username, email and password are required' });

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, role, language) VALUES (?, ?, ?, ?, ?)',
      [username, email, hash, role, language]
    );
    const token = jwt.sign(
      { id: result.insertId, username, role, language },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user: { id: result.insertId, username, email, role, language } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Username or email already exists' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'email and password are required' });

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, language: user.language },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, language: user.language },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
