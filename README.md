# DatabaseService


# QMatrix Employee Management System

Eine moderne Webanwendung zur Verwaltung von Mitarbeiterdaten mit React Frontend und Express/SQL Server Backend.

## 🚀 Features

- **Mitarbeiterverwaltung**
  - Anzeige aller Mitarbeiter
  - Detailansicht einzelner Mitarbeiter
  - Hinzufügen neuer Mitarbeiter
  - Bearbeiten bestehender Mitarbeiter
  - Löschen von Mitarbeitern

- **Erweiterte Filterfunktionen**
  - Paginierung
  - Sortierung nach verschiedenen Feldern
  - Suche über mehrere Felder
  - Filterung nach Abteilung
  - Status-Filter (aktiv/inaktiv)

## 🛠 Technologie-Stack

- **Frontend**
  - React
  - Axios für API-Anfragen
  - Tailwind CSS für Styling

- **Backend**
  - Node.js
  - Express.js
  - MS SQL Server
  - mssql für Datenbankverbindungen

## 📋 Voraussetzungen

- Node.js (Version 14 oder höher)
- MS SQL Server
- npm oder yarn als Paketmanager

## ⚙️ Installation

1. Repository klonen:
   ```bash
   git clone [https://github.com/DeR0X/DatabaseService]
   cd DatabaseService
   ```

2. Dependencies installieren:
   ```bash
   npm install
   ```

3. Umgebungsvariablen konfigurieren:
   Erstellen Sie eine `.env` Datei im Wurzelverzeichnis mit folgenden Variablen:
   ```
   DB_USER=IhrBenutzerName
   DB_PASSWORD=IhrPasswort
   DB_NAME=IhreDatenbank
   DB_SERVER=IhrServer
   ```

## 🚀 Entwicklung starten

1. Backend-Server starten:
   ```bash
   npm run server
   ```

2. Frontend-Entwicklungsserver starten:
   ```bash
   npm run client
   ```

3. Beide Server gleichzeitig starten:
   ```bash
   npm run dev
   ```

## 📡 API-Endpunkte

### Basis-Endpunkte

- `GET /api/employees`
  - Liefert alle Mitarbeiter zurück
  - Keine Filter oder Paginierung

- `GET /api/employees/:id`
  - Liefert einen spezifischen Mitarbeiter zurück
  - Parameter: `id` (Mitarbeiter-ID)

### Erweiterte Endpunkte (v2)

- `GET /api/v2/employees`
  - Erweiterte Mitarbeiterabfrage mit Filteroptionen
  - Query-Parameter:
    - `page`: Seitennummer (Standard: 1)
    - `limit`: Einträge pro Seite (Standard: 10)
    - `search`: Suche in Name und Email
    - `department`: Filterung nach Abteilung
    - `isActive`: Filterung nach Status (true/false)
    - `sortBy`: Sortierfeld (Surname, Firstname, email, DepartmentID)
    - `sortOrder`: Sortierrichtung (asc/desc)

- `GET /api/v2/employees/:id`
  - Erweiterte Detailansicht eines Mitarbeiters
  - Inkl. Abteilungsinformationen

## 🔍 Beispiel-Anfragen

```bash
# Alle Mitarbeiter mit Paginierung
GET http://localhost:5000/api/v2/employees?page=1&limit=10

# Suche nach Mitarbeitern
GET http://localhost:5000/api/v2/employees?search=john

# Filterung nach Abteilung
GET http://localhost:5000/api/v2/employees?department=IT

# Sortierung
GET http://localhost:5000/api/v2/employees?sortBy=Surname&sortOrder=asc

# Kombinierte Filter
GET http://localhost:5000/api/v2/employees?department=IT&isActive=true&sortBy=Surname
```

## 📝 Entwicklungshinweise

- Alle API-Anfragen werden geloggt (Debug-Middleware)
- CORS ist für alle Ursprünge aktiviert
- Fehlerbehandlung ist implementiert
- Typenkonvertierung für Department-IDs wird automatisch durchgeführt

## 🔒 Sicherheitshinweise

- Produktive Systeme sollten CORS entsprechend einschränken
- Sensitive Daten sollten verschlüsselt werden
- API-Rate-Limiting sollte implementiert werden
- Authentifizierung und Autorisierung sollten hinzugefügt werden
