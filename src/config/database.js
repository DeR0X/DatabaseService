import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  options: {
    encrypt: true,
    trustServerCertificate: true, // For development only
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

export async function connectToDatabase() {
  try {
    const pool = await sql.connect(sqlConfig);
    console.log('Successfully connected to the database');
    return pool;
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
}