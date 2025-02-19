import express from 'express';
import cors from 'cors';
import { connectToDatabase } from '../src/config/database.js';

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Endpoint to get active employees
app.get('/api/employees', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .query('SELECT * FROM tblEmployees WHERE isActive = 1');
    
    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});