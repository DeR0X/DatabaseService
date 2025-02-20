import { connectToDatabase } from './config/database.js';

async function main() {
  try {
    const pool = await connectToDatabase();
    
    // Beispielabfragen für die verschiedenen Tabellen
    console.log('\n=== Datenbankabfragen ===\n');

    // 1. Aktive Mitarbeiter mit ihren Abteilungen
    console.log('1. Mitarbeiter mit Abteilungen:');
    const employees = await pool.request().query(`
      SELECT 
        e.EmployeeID,
        e.Surname,
        e.Firstname,
        e.email,
        d.Department
      FROM tblEmployees e
      LEFT JOIN tblDepartments d ON e.DepartmentID = d.DepartmentID_Atoss
      WHERE e.isActive = 1
    `);
    console.log(employees.recordset);

    // 2. Qualifikationen der Mitarbeiter
    console.log('\n2. Mitarbeiter-Qualifikationen:');
    const qualifications = await pool.request().query(`
      SELECT 
        e.Surname,
        e.Firstname,
        q.Name as Qualification,
        q.Description,
        eq.QualifiedUntil
      FROM tblEmployees e
      JOIN tblEmployee_Qualifications eq ON e.EmployeeID = eq.EmployeeID
      JOIN tblQualifications q ON eq.QualificationID = q.ID
      WHERE e.isActive = 1
    `);
    console.log(qualifications.recordset);

    // 3. Zusätzliche Fähigkeiten der Mitarbeiter
    console.log('\n3. Zusätzliche Fähigkeiten:');
    const additionalSkills = await pool.request().query(`
      SELECT 
        e.Surname,
        e.Firstname,
        s.Name as Skill,
        s.Description
      FROM tblEmployees e
      JOIN tblEmployee_AdditionalSkills eas ON e.EmployeeID = eas.EmployeeID
      JOIN tblAdditionalSkills s ON eas.SkillID = s.ID
      WHERE e.isActive = 1
    `);
    console.log(additionalSkills.recordset);

    // 4. Schulungen der Mitarbeiter
    console.log('\n4. Mitarbeiter-Schulungen:');
    const trainings = await pool.request().query(`
      SELECT 
        e.Surname,
        e.Firstname,
        t.Name as Training,
        t.Description,
        t.Qualification_ValidTo,
        t.TrainerID
      FROM tblEmployees e
      JOIN tblEmployee_Qualifications_Trainings eqt ON e.EmployeeID = eqt.EmployeeID
      JOIN tblTraining t ON eqt.TrainingID = t.ID
      WHERE e.isActive = 1
    `);
    console.log(trainings.recordset);

    // 5. Verfügbare Trainer
    console.log('\n5. Qualifizierte Trainer:');
    const trainers = await pool.request().query(`
      SELECT 
        e.Surname,
        e.Firstname,
        q.Name as TrainerQualification
      FROM tblEmployees e
      JOIN tblQualification_Trainer qt ON e.EmployeeID = qt.EmployeeID
      JOIN tblQualifications q ON qt.QualificationID = q.ID
      WHERE e.isActive = 1
    `);
    console.log(trainers.recordset);

    await pool.close();
    console.log('\n=== Datenbankverbindung geschlossen ===');
  } catch (err) {
    console.error('Fehler:', err);
    process.exit(1);
  }
}

main();