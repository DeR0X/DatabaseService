import express from 'express';
import cors from 'cors';
import { connectToDatabase } from '../src/config/database.js';

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// GET all employees with filtering and search
app.get('/api/employees', async (req, res) => {
  try {
    const { 
      search,
      department,
      position,
      active,
      sortBy = 'lastName',
      sortOrder = 'asc'
    } = req.query;

    const pool = await connectToDatabase();
    let query = `
      SELECT 
        e.employeeId,
        e.firstName,
        e.lastName,
        e.email,
        d.departmentName as department,
        p.positionName as position,
        e.isActive
      FROM tblEmployees e
      LEFT JOIN tblDepartments d ON e.departmentId = d.departmentId
      LEFT JOIN tblPositions p ON e.positionId = p.positionId
      WHERE 1=1
    `;

    const params = {};

    if (search) {
      query += ` AND (
        e.firstName LIKE @search
        OR e.lastName LIKE @search
        OR e.email LIKE @search
        OR e.phoneNumber LIKE @search
      )`;
      params.search = `%${search}%`;
    }

    if (department) {
      query += ` AND d.departmentId = @department`;
      params.department = department;
    }

    if (position) {
      query += ` AND p.positionId = @position`;
      params.position = position;
    }

    if (active !== undefined) {
      query += ` AND e.isActive = @active`;
      params.active = active === 'true' ? 1 : 0;
    }

    // Add sorting
    query += ` ORDER BY ${
      sortBy === 'department' ? 'd.departmentName' :
      sortBy === 'position' ? 'p.positionName' :
      'e.lastName'
    } ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;

    let request = pool.request();
    
    // Add parameters to request
    Object.entries(params).forEach(([key, value]) => {
      request = request.input(key, value);
    });
    
    const result = await request.query(query);
    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET employee statistics
app.get('/api/employees/stats', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    
    const stats = await pool.request().query(`
      SELECT
        COUNT(*) as totalEmployees,
        COUNT(CASE WHEN isActive = 1 THEN 1 END) as activeEmployees,
        COUNT(DISTINCT departmentId) as departmentCount,
        COUNT(DISTINCT positionId) as positionCount
      FROM tblEmployees
    `);

    const departmentStats = await pool.request().query(`
      SELECT 
        d.departmentName,
        COUNT(*) as employeeCount,
      FROM tblEmployees e
      JOIN tblDepartments d ON e.departmentId = d.departmentId
      WHERE e.isActive = 1
      GROUP BY d.departmentName
    `);

    const salaryRanges = await pool.request().query(`
      SELECT 
        COUNT(*) as employeeCount
      FROM tblEmployees
      WHERE isActive = 1
    `);

    await pool.close();
    res.json({
      overview: stats.recordset[0],
      departmentStats: departmentStats.recordset,
      salaryDistribution: salaryRanges.recordset
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET employee search suggestions
app.get('/api/employees/search', async (req, res) => {
  try {
    const { query } = req.query;
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('query', `%${query}%`)
      .query(`
        SELECT TOP 10
          e.employeeId,
          e.firstName,
          e.lastName,
          e.email,
          d.departmentName as department
        FROM tblEmployees e
        LEFT JOIN tblDepartments d ON e.departmentId = d.departmentId
        WHERE 
          e.isActive = 1
          AND (
            e.firstName LIKE @query
            OR e.lastName LIKE @query
            OR e.email LIKE @query
          )
        ORDER BY e.lastName, e.firstName
      `);
    
    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET department statistics
app.get('/api/departments/stats', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .query(`
        SELECT 
          d.id,
          d.departmentid_atoss,
          d.department,
        FROM tblDepartments d
        LEFT JOIN tblEmployees e ON d.departmentId = e.departmentId AND e.isActive = 1
        GROUP BY d.departmentId, d.departmentName
        ORDER BY d.departmentName
      `);
    
    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE employee (soft delete)
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    
    // Check if employee exists
    const checkResult = await pool.request()
      .input('id', req.params.id)
      .query('SELECT employeeId FROM tblEmployees WHERE employeeId = @id');
    
    if (checkResult.recordset.length === 0) {
      await pool.close();
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Soft delete by setting isActive to false
    await pool.request()
      .input('id', req.params.id)
      .query(`
        UPDATE tblEmployees
        SET isActive = 0
        WHERE employeeId = @id
      `);
    
    await pool.close();
    res.status(204).send();
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET departments
app.get('/api/departments', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .query('SELECT * FROM tblDepartments ORDER BY departmentName');
    
    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET positions
app.get('/api/positions', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .query('SELECT * FROM tblPositions ORDER BY positionName');
    
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