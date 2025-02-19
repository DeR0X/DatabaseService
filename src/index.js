import { connectToDatabase } from './config/database.js';

async function main() {
  try {
    const pool = await connectToDatabase();
    
    // Query active employees
    const result = await pool.request()
      .query('SELECT * FROM tblEmployees WHERE isActive = 1');
    
    console.log('Active Employees:', result.recordset);
    
    // Close the connection
    await pool.close();
  } catch (err) {
    console.error('Error in main:', err);
    process.exit(1);
  }
}

main();