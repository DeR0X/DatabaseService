import express from 'express';
import cors from 'cors';
import { connectToDatabase } from '../src/config/database.js';

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// GET Mitarbeiter mit Filtern und Suche
app.get('/api/employees', async (req, res) => {
  try {
    const { 
      search,
      department,
      qualification,
      isActive = true,
      sortBy = 'Surname',
      sortOrder = 'asc'
    } = req.query;

    const pool = await connectToDatabase();
    let query = `
      SELECT DISTINCT
        e.ID,
        e.Surname,
        e.Firstname,
        e.email,
        d.Department,
        STRING_AGG(q.Name, ', ') WITHIN GROUP (ORDER BY q.Name) as Qualifications
      FROM tblEmployees e
      LEFT JOIN tblDepartments d ON e.DepartmentID = d.DepartmentID_Atoss
      LEFT JOIN tblEmployee_Qualifications eq ON e.ID = eq.EmployeeID
      LEFT JOIN tblQualifications q ON eq.QualificationID = q.ID
      WHERE e.isActive = @isActive
    `;

    const params = {
      isActive: isActive === 'true' ? 1 : 0
    };

    if (search) {
      query += ` AND (
        e.Surname LIKE @search
        OR e.Firstname LIKE @search
        OR e.email LIKE @search
      )`;
      params.search = `%${search}%`;
    }

    if (department) {
      query += ` AND d.DepartmentID_Atoss = @department`;
      params.department = department;
    }

    if (qualification) {
      query += ` AND EXISTS (
        SELECT 1 FROM tblEmployee_Qualifications eq2
        JOIN tblQualifications q2 ON eq2.QualificationID = q2.ID
        WHERE eq2.EmployeeID = e.ID AND q2.ID = @qualification
      )`;
      params.qualification = qualification;
    }

    query += ` GROUP BY e.ID, e.Surname, e.Firstname, e.email, d.Department`;

    // Sortierung
    query += ` ORDER BY ${
      sortBy === 'department' ? 'd.Department' :
      sortBy === 'qualifications' ? 'Qualifications' :
      `e.${sortBy}`
    } ${sortOrder.toUpperCase()}`;

    let request = pool.request();
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

// GET Mitarbeiter-Statistiken
app.get('/api/employees/stats', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    
    const stats = await pool.request().query(`
      SELECT
        COUNT(*) as totalEmployees,
        SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeEmployees,
        COUNT(DISTINCT DepartmentID) as departmentCount,
        (
          SELECT COUNT(DISTINCT QualificationID)
          FROM tblEmployee_Qualifications
        ) as qualificationCount
      FROM tblEmployees
    `);

    const departmentStats = await pool.request().query(`
      SELECT 
        d.Department,
        COUNT(e.ID) as employeeCount
      FROM tblDepartments d
      LEFT JOIN tblEmployees e ON d.DepartmentID_Atoss = e.DepartmentID AND e.isActive = 1
      GROUP BY d.Department
      ORDER BY employeeCount DESC
    `);

    const qualificationStats = await pool.request().query(`
      SELECT 
        q.Name as qualification,
        COUNT(eq.EmployeeID) as employeeCount
      FROM tblQualifications q
      LEFT JOIN tblEmployee_Qualifications eq ON q.ID = eq.QualificationID
      LEFT JOIN tblEmployees e ON eq.EmployeeID = e.ID AND e.isActive = 1
      GROUP BY q.Name
      ORDER BY employeeCount DESC
    `);

    await pool.close();
    res.json({
      overview: stats.recordset[0],
      departmentStats: departmentStats.recordset,
      qualificationStats: qualificationStats.recordset
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Mitarbeiter-Details mit Qualifikationen und Skills
app.get('/api/employees/:id', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    
    // Basis-Informationen
    const employeeInfo = await pool.request()
      .input('id', req.params.id)
      .query(`
        SELECT 
          e.ID,
          e.Surname,
          e.Firstname,
          e.email,
          d.Department
        FROM tblEmployees e
        LEFT JOIN tblDepartments d ON e.DepartmentID = d.DepartmentID_Atoss
        WHERE e.ID = @id
      `);

    if (employeeInfo.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Qualifikationen
    const qualifications = await pool.request()
      .input('id', req.params.id)
      .query(`
        SELECT 
          q.Name,
          q.Description,
          eq.QualifiedUntil
        FROM tblEmployee_Qualifications eq
        JOIN tblQualifications q ON eq.QualificationID = q.ID
        WHERE eq.EmployeeID = @id
      `);

    // Zusätzliche Skills
    const skills = await pool.request()
      .input('id', req.params.id)
      .query(`
        SELECT 
          s.Name,
          s.Description
        FROM tblEmployee_AdditionalSkills eas
        JOIN tblAdditionalSkills s ON eas.SkillID = s.ID
        WHERE eas.EmployeeID = @id
      `);

    // Schulungen
    const trainings = await pool.request()
      .input('id', req.params.id)
      .query(`
        SELECT 
          t.Name,
          t.Description,
          t.Qualification_ValidTo,
          CONCAT(e.Firstname, ' ', e.Surname) as TrainerName
        FROM tblEmployee_Qualifications_Trainings eqt
        JOIN tblTraining t ON eqt.TrainingID = t.ID
        LEFT JOIN tblEmployees e ON t.TrainerID = e.ID
        WHERE eqt.EmployeeID = @id
      `);

    await pool.close();
    res.json({
      ...employeeInfo.recordset[0],
      qualifications: qualifications.recordset,
      skills: skills.recordset,
      trainings: trainings.recordset
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Abteilungen
app.get('/api/departments', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .query('SELECT DepartmentID_Atoss as id, Department as name FROM tblDepartments ORDER BY Department');
    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Qualifikationen
app.get('/api/qualifications', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .query('SELECT ID as id, Name as name, Description FROM tblQualifications ORDER BY Name');
    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Trainer
app.get('/api/trainers', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .query(`
        SELECT DISTINCT
          e.ID,
          e.Surname,
          e.Firstname,
          STRING_AGG(q.Name, ', ') WITHIN GROUP (ORDER BY q.Name) as Qualifications
        FROM tblEmployees e
        JOIN tblQualification_Trainer qt ON e.ID = qt.EmployeeID
        JOIN tblQualifications q ON qt.QualificationID = q.ID
        WHERE e.isActive = 1
        GROUP BY e.ID, e.Surname, e.Firstname
        ORDER BY e.Surname, e.Firstname
      `);
    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});