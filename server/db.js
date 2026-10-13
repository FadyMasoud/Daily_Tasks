const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Hosted MySQL providers (TiDB, Aiven, Railway, PlanetScale…) require TLS.
// Enable with DB_SSL=true. Aiven uses its own CA — paste the contents of its
// ca.pem into DB_SSL_CA (preferred), or set DB_SSL_REJECT_UNAUTHORIZED=false.
const ssl = process.env.DB_SSL === 'true'
  ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      // Env UIs sometimes store the PEM with literal "\n" — turn those back into newlines.
      ...(process.env.DB_SSL_CA && { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') }),
    }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'daily_tasks_db',
  ssl,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5, // small: each serverless instance has its own pool
  queueLimit: 0,
  timezone: '+00:00',
});

module.exports = pool;
