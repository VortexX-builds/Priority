const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'prioritize.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        db.run('PRAGMA foreign_keys = ON');

        db.run(`CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'MEMBER',
            avg_velocity REAL DEFAULT 1.0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS Tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            external_task_id TEXT,
            title TEXT NOT NULL,
            deadline_days INTEGER DEFAULT 1,
            effort INTEGER DEFAULT 1,
            impact INTEGER DEFAULT 1,
            workload REAL DEFAULT 1.0,
            status TEXT DEFAULT 'PENDING',
            priority_score REAL DEFAULT 0.0,
            priority_label TEXT DEFAULT 'Low',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            FOREIGN KEY(user_id) REFERENCES Users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS Logic_Logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            predicted_effort INTEGER,
            actual_duration REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(task_id) REFERENCES Tasks(id)
        )`);

        // Migrations for existing databases — silently ignored if columns already exist
        const migrations = [
            `ALTER TABLE Tasks ADD COLUMN external_task_id TEXT`,
            `ALTER TABLE Tasks ADD COLUMN deadline_days INTEGER DEFAULT 1`,
            `ALTER TABLE Tasks ADD COLUMN workload REAL DEFAULT 1.0`,
            `ALTER TABLE Tasks ADD COLUMN priority_label TEXT DEFAULT 'Low'`,
            `ALTER TABLE Tasks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
        ];
        migrations.forEach(sql => db.run(sql, [], () => {}));
    }
});

module.exports = db;
