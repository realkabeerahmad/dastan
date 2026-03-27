import { Pool } from 'pg';

const globalForPg = globalThis;

const pool = globalForPg._pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg._pgPool = pool;
}

/**
 * Execute a query against the PostgreSQL database.
 * @param {string} text - The SQL query text.
 * @param {Array} params - The parameterized values for the query.
 * @returns {Promise<import('pg').QueryResult>} The result of the query.
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

/**
 * Execute multiple queries within a single database transaction.
 * Useful for ensuring accounts are created ONLY if the property is created.
 * @param {Function} callback - A callback that receives the connected client to run queries on.
 * @returns {Promise<any>} The result of the callback.
 */
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
