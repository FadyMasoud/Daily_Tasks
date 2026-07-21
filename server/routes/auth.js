const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
// Public sign-up: always role 'user', always inactive (active = 0) until an
// admin approves. No token is issued — the user cannot log in yet.
router.post('/register', async (req, res) => {
  const { username, email, password, language = 'en' } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'username, email and password are required' });

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.execute(
      "INSERT INTO users (username, email, password_hash, role, language, active) VALUES (?, ?, ?, 'user', ?, 0)",
      [username, email, hash, language]
    );
    res.status(201).json({ pending: true, message: 'Account created — awaiting admin approval' });
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

    // Gate: account must be approved (active) by an admin before login.
    if (!user.active)
      return res.status(403).json({ code: 'inactive', message: 'Please Wait for admin confirm .' });

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
