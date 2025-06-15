// backend/config/db.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Ensure .env in backend/ is loaded
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false, // Basic SSL support, adjust as needed
  max: 20, // Max number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection to be established
});

pool.on('connect', client => {
  console.log('[DB] New client connected to PostgreSQL');
});

pool.on('error', (err, client) => {
  console.error('[DB] Unexpected error on idle PostgreSQL client', err);
  process.exit(-1); // Exit if an idle client encounters a critical error
});

// Test the connection
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('[DB] Successfully connected to PostgreSQL via connection pool!');
    const res = await client.query('SELECT NOW()');
    console.log('[DB] PostgreSQL current time:', res.rows[0].now);
  } catch (err) {
    console.error('[DB] Failed to connect to PostgreSQL:', err.stack);
    // Optionally, exit if connection fails on startup, or handle reconnection logic
    // process.exit(1); 
  } finally {
    if (client) {
      client.release(); // Release the client back to the pool
    }
  }
}

// Call testConnection on startup if not in test environment
if (process.env.NODE_ENV !== 'test') {
  testConnection();
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(), // To use transactions
  pool, // Export the pool itself if direct access is needed
  testConnection // Export for testing purposes
};