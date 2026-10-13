// Load schema.sql into the database configured in .env (e.g. a fresh Aiven service).
// schema.sql creates daily_tasks_db and every table — the migrate_*.sql files are only
// for upgrading an older database and must NOT be run on a fresh one.
//
// Usage:
//   node server/scripts/init-db.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ssl = process.env.DB_SSL === 'true'
  ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ...(process.env.DB_SSL_CA && { ca: process.env.DB_SSL_CA.replace(/\n/g, '\n') }),
    }
  : undefined;

(async () => {
  // No `database` here — schema.sql runs CREATE DATABASE / USE itself.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl,
    multipleStatements: true,
  });
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../../schema.sql'), 'utf8');
    await conn.query(sql);
    const [tables] = await conn.query('SHOW TABLES FROM daily_tasks_db');
    console.log(`Schema loaded. Tables: ${tables.map(t => Object.values(t)[0]).join(', ')}`);
  } finally {
    await conn.end();
  }
})().catch(err => {
  console.error('Init failed:', err.message);
  process.exit(1);
});
