import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let isConfigured = false;

export function getMySQLPool(): mysql.Pool | null {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306;

  if (!host || !user || !database) {
    isConfigured = false;
    return null;
  }

  try {
    pool = mysql.createPool({
      host,
      port,
      user,
      password: password || '',
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
    });
    isConfigured = true;
    console.log(`📡 MySQL Pool initialized for host: ${host}, database: ${database}`);
    return pool;
  } catch (err: any) {
    console.warn('⚠️ MySQL pool creation error:', err?.message || err);
    return null;
  }
}

export async function testMySQLConnection(): Promise<{ success: boolean; message: string; host?: string; database?: string }> {
  const p = getMySQLPool();
  if (!p) {
    return {
      success: false,
      message: 'MySQL is not configured yet. Please set MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE in your environment variables.',
    };
  }

  try {
    const connection = await p.getConnection();
    const [rows] = await connection.query('SELECT 1 as connected');
    connection.release();
    return {
      success: true,
      message: 'Successfully connected to MySQL database!',
      host: process.env.MYSQL_HOST,
      database: process.env.MYSQL_DATABASE,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to connect to MySQL: ${error?.message || error}`,
      host: process.env.MYSQL_HOST,
      database: process.env.MYSQL_DATABASE,
    };
  }
}

export async function queryMySQL<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getMySQLPool();
  if (!p) {
    throw new Error('MySQL connection is not configured.');
  }
  const [rows] = await p.execute(sql, params);
  return rows as T[];
}

export function getMySQLStatus() {
  return {
    configured: isConfigured || !!(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE),
    host: process.env.MYSQL_HOST || null,
    database: process.env.MYSQL_DATABASE || null,
    port: process.env.MYSQL_PORT || 3306,
  };
}
