// Create (or promote) an admin account. Use this to bootstrap the first admin
// on a fresh/hosted database, since public registration only makes inactive users.
//
// Usage:
//   node server/scripts/create-admin.js <username> <email> <password> [language]
//
// Reads DB connection from the server .env (same as the app).
const bcrypt = require('bcrypt');
const pool = require('../db');

const [, , username, email, password, language = 'ar'] = process.argv;

if (!username || !email || !password) {
  console.error('Usage: node server/scripts/create-admin.js <username> <email> <password> [language]');
  process.exit(1);
}

(async () => {
  try {
    const hash = await bcrypt.hash(password, 12);
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);

    if (existing.length) {
      await pool.execute(
        "UPDATE users SET username = ?, password_hash = ?, role = 'admin', active = 1, language = ? WHERE email = ?",
        [username, hash, language, email]
      );
      console.log(`Updated existing account -> admin (active): ${email}`);
    } else {
      await pool.execute(
        "INSERT INTO users (username, email, password_hash, role, language, active) VALUES (?, ?, ?, 'admin', ?, 1)",
        [username, email, hash, language]
      );
      console.log(`Created admin (active): ${email}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();
