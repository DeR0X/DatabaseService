import express from 'express';
import cors from 'cors';
import { connectToDatabase } from '../src/config/database.js';
import sql from 'mssql';

const app = express();
const port = process.env.PORT || 5000;

// Debug Middleware für API-Aufrufe
const debugMiddleware = (req, res, next) => {
  const startTime = Date.now();
  console.log('\n=== API Request ===');
  console.log('Zeitpunkt:', new Date().toISOString());
  console.log('Methode:', req.method);
  console.log('URL:', req.url);
  console.log('Query Parameter:', req.query);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);

  // Response Interceptor
  const originalJson = res.json;
  res.json = function(body) {
    const endTime = Date.now();
    console.log('\n=== API Response ===');
    console.log('Status:', res.statusCode);
    console.log('Dauer:', endTime - startTime, 'ms');
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('==================\n');
    return originalJson.call(this, body);
  };

  next();
};

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(debugMiddleware);

// Original simple endpoints
app.get('/api/employees', async (req, res) => {
  const pool = await connectToDatabase();
  const result = await pool.request().query('SELECT * FROM tblEmployees');
  res.json(result.recordset);
});

app.get('/api/employees/:id', async (req, res) => {
  const pool = await connectToDatabase();
  const result = await pool.request()
    .input('id', sql.VarChar, req.params.id)
    .query('SELECT * FROM tblEmployees WHERE id = @id');
  res.json(result.recordset);
});

// Enhanced endpoints with filtering
app.get('/api/v2/employees', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    
    // Basic query without pagination first
    let query = `
      SELECT 
        e.*,
        d.Department 
      FROM tblEmployees e 
      LEFT JOIN tblDepartments d ON CAST(e.DepartmentID as nvarchar) = CAST(d.DepartmentID_Atoss as nvarchar)
    `;
    
    let conditions = [];
    let queryParams = {};

    // Add filters if they exist
    if (req.query.search) {
      conditions.push("(e.Firstname LIKE @search OR e.Surname LIKE @search OR e.email LIKE @search)");
      queryParams.search = { type: sql.NVarChar, value: `%${req.query.search}%` };
    }

    if (req.query.department) {
      conditions.push("d.Department = @department");
      queryParams.department = { type: sql.NVarChar, value: req.query.department };
    }

    if (req.query.isActive !== undefined) {
      conditions.push("e.isActive = @isActive");
      queryParams.isActive = { type: sql.Bit, value: req.query.isActive === 'true' ? 1 : 0 };
    }

    // Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add sorting
    const validColumns = ['Surname', 'Firstname', 'email', 'DepartmentID'];
    const sortBy = validColumns.includes(req.query.sortBy) ? req.query.sortBy : 'Surname';
    const sortOrder = req.query.sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY e.${sortBy} ${sortOrder}`;

    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    queryParams.offset = { type: sql.Int, value: offset };
    queryParams.limit = { type: sql.Int, value: limit };

    // Build and execute the request
    let request = pool.request();
    for (const [key, param] of Object.entries(queryParams)) {
      request.input(key, param.type, param.value);
    }

    console.log('Executing query:', query);
    console.log('With parameters:', queryParams);

    const result = await request.query(query);

    // Get total count
    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM tblEmployees');
    const total = countResult.recordset[0].total;

    res.json({
      data: result.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ 
      error: 'Failed to fetch employees',
      details: error.message 
    });
  }
});

app.get('/api/v2/employees/:id', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('id', sql.VarChar, req.params.id)
      .query(`
        SELECT 
          e.*, 
          d.Department 
        FROM tblEmployees e 
        LEFT JOIN tblDepartments d ON CAST(e.DepartmentID as nvarchar) = CAST(d.DepartmentID_Atoss as nvarchar)
        WHERE e.ID = @id
      `);
    
    if (result.recordset.length === 0) {
      res.status(404).json({ error: 'Employee not found' });
    } else {
      res.json(result.recordset[0]);
    }
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ 
      error: 'Failed to fetch employee',
      details: error.message 
    });
  }
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'QMatrix Datastructure API',
    version: '1.0.0',
    description: 'API for QMatrix',
    endpoints: {
      'api/employees': {
        get: {
          description: 'Get all employees (simple version)',
          note: 'Returns all employees without filtering'
        }
      },
      'api/employees/:id': {
        get: {
          description: 'Get employee by ID (simple version)',
          parameters: {
            id: 'Employee ID'
          }
        }
      },
      'api/v2/employees': {
        get: {
          description: 'Get all employees with filtering options',
          parameters: {
            page: 'Page number for pagination (default: 1)',
            limit: 'Number of items per page (default: 10)',
            search: 'Search in name and email',
            department: 'Filter by department',
            isActive: 'Filter by active status (true/false)',
            sortBy: 'Field to sort by (Surname, Firstname, email, DepartmentID)',
            sortOrder: 'Sort direction (asc/desc)'
          }
        }
      }
    }
  });
});

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});