import express from 'express';
import cors from 'cors';
import { connectToDatabase } from '../src/config/database.js';

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

// CORS konfigurieren für öffentlichen Zugriff
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(debugMiddleware); // Debug Middleware aktivieren

// SQL Query Logger
const logQuery = (query, params) => {
  console.log('\n=== SQL Query ===');
  console.log('Query:', query);
  console.log('Parameter:', params);
  console.log('================\n');
};

app.get('/api/employees', async (req, res) => {
  const pool = await connectToDatabase();
  const result = await pool.request().query('SELECT * FROM tblEmployees');
  res.json(result.recordset);
});

app.get('/api/employees/:id', async (req, res) => {
  const pool = await connectToDatabase();
  const result = await pool.request()
    .input('id', req.params.id)
    .query('SELECT * FROM tblEmployees WHERE id = @id');
  res.json(result.recordset);
});


// API Dokumentation
app.get('/api', (req, res) => {
  res.json({
    name: 'QMatrix Datastructure API',
    version: '1.0.0',
    description: 'API for QMatrix',
    _links: {
      self: '/api',
      employees: '/api/employees',
      departments: '/api/departments',
      qualifications: '/api/qualifications'
    },
    endpoints: {
      employees: {
        get: {
          description: 'Get all employees',
          parameters: {
            search: 'Search in name and email',
            department: 'Filter by department ID',
            qualification: 'Filter by qualification ID',
            isActive: 'Filter by active status (default: true)',
            sortBy: 'Sort field (default: Surname)',
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