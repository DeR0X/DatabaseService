import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// Überprüfung der Umgebungsvariablen
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_SERVER'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Fehlende Umgebungsvariablen:', missingEnvVars);
  console.error('Bitte erstellen Sie eine .env Datei mit den folgenden Variablen:');
  console.error(`
DB_USER=IhrBenutzerName
DB_PASSWORD=IhrPasswort
DB_NAME=IhreDatenbank
DB_SERVER=IhrServer
  `);
  throw new Error('Fehlende Umgebungsvariablen');
}

export const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  options: {
    encrypt: true, // Verschlüsselung aktiviert
    trustServerCertificate: true, // Serverzertifikat vertrauen
    enableArithAbort: true,
    authentication: {
      type: 'default', // SQL Server Authentication
      options: {
        userName: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
    }
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function testServerConnection(config) {
  try {
    const testConfig = {
      ...config,
      database: 'QMatrix_Test' 
    };
    await sql.connect(testConfig);
    console.log('✓ Server-Verbindung erfolgreich');
    await sql.close();
    return true;
  } catch (err) {
    console.error('✗ Server-Verbindung fehlgeschlagen');
    return false;
  }
}

async function testAuthentication(config) {
  try {
    const testConfig = {
      ...config,
      database: 'master'
    };
    await sql.connect(sqlConfig);
    console.log('✓ Authentifizierung erfolgreich');
    await sql.close();
    return true;
  } catch (err) {
    if (err.code === 'ELOGIN') {
      console.error('✗ Authentifizierung fehlgeschlagen - Ungültige Anmeldedaten');
    }
    return false;
  }
}

async function testDatabaseAccess(config) {
  try {
    await sql.connect(config);
    console.log('✓ Datenbankzugriff erfolgreich');
    await sql.close();
    return true;
  } catch (err) {
    if (err.code === 'ENAME') {
      console.error(`✗ Datenbank '${config.database}' nicht gefunden oder keine Berechtigung`);
    }
    return false;
  }
}

export async function connectToDatabase() {
  console.log('\n=== Starte Verbindungsdiagnose ===');
  console.log('Konfiguration:');
  console.log('- Server:', process.env.DB_SERVER);
  console.log('- Datenbank:', process.env.DB_NAME);
  console.log('- Benutzer:', process.env.DB_USER);
  console.log('\nFühre Tests durch...\n');

  try {
    // Test 1: Server-Erreichbarkeit
    const serverOk = await testServerConnection(sqlConfig);
    if (!serverOk) {
      throw new Error('Server nicht erreichbar');
    }

    // Test 2: Authentifizierung
    const authOk = await testAuthentication(sqlConfig);
    if (!authOk) {
      throw new Error('Authentifizierung fehlgeschlagen');
    }

    // Test 3: Datenbankzugriff
    const dbOk = await testDatabaseAccess(sqlConfig);
    if (!dbOk) {
      throw new Error('Datenbankzugriff fehlgeschlagen');
    }

    // Finale Verbindung
    const pool = await sql.connect(sqlConfig);
    console.log('\n✓ Verbindung erfolgreich hergestellt!');
    return pool;
  } catch (err) {
    console.error('\n=== Fehlerdetails ===');
    console.error('Fehlercode:', err.code || 'Kein Code');
    console.error('Fehlermeldung:', err.message);
    
    // Erweiterte Fehleranalyse
    if (err.code === 'ETIMEOUT') {
      console.error('\nMögliche Ursachen:');
      console.error('- Firewall blockiert die Verbindung');
      console.error('- Server ist nicht erreichbar');
      console.error('- Port ist nicht geöffnet (Standard: 1433)');
    } else if (err.code === 'ELOGIN') {
      console.error('\nMögliche Ursachen:');
      console.error('- Benutzername falsch');
      console.error('- Passwort falsch');
      console.error('- Windows-Authentifizierung erforderlich');
    } else if (err.code === 'ENAME') {
      console.error('\nMögliche Ursachen:');
      console.error('- Datenbank existiert nicht');
      console.error('- Benutzer hat keine Berechtigung für die Datenbank');
    }
    
    console.error('\nEmpfohlene Schritte:');
    console.error('1. Überprüfen Sie die Verbindungsdaten in der .env Datei');
    console.error('2. Stellen Sie sicher, dass der SQL Server läuft und erreichbar ist');
    console.error('3. Überprüfen Sie die Firewall-Einstellungen');
    console.error('4. Kontrollieren Sie die Benutzerberechtigungen im SQL Server');
    
    throw err;
  }
}