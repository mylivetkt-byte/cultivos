import mysql from 'mysql2/promise';

// Load DB configuration from environment variables with sensible defaults
const DB_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.MYSQL_PORT, 10) || 3306;
const DB_USER = process.env.MYSQL_USER || 'root';
const DB_PASSWORD = process.env.MYSQL_PASSWORD || '';
const DB_NAME = process.env.MYSQL_DATABASE || 'sas_agricolas';

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  connectTimeout: 10000,
});

// Test the connection pool on startup for easier debugging
pool.getConnection()
  .then(conn => {
    console.log(`[DB] Connection pool established (host:${DB_HOST}, port:${DB_PORT})`);
    conn.release();
  })
  .catch(err => {
  console.error('[DB] Unable to create connection pool:', err.message);
  // Attempt reconnection with exponential backoff (max 3 attempts)
  const retry = async (attempt = 1) => {
    if (attempt > 3) {
      console.error('[DB] Max reconnection attempts reached. Exiting.');
      process.exit(1);
    }
    try {
      const conn = await pool.getConnection();
      console.log(`[DB] Reconnected on attempt ${attempt}`);
      conn.release();
    } catch (e) {
      console.warn(`[DB] Reconnection attempt ${attempt} failed: ${e.message}`);
      setTimeout(() => retry(attempt + 1), 2000 * attempt);
    }
  };
  retry();
});

export default pool;
