const Database = require('better-sqlite3');
const path = require('path');

let db = null;

function getDB() {
  if (db) return db;

  const dbPath = path.join(__dirname, '..', 'data', 'learning.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS curricula (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      structure TEXT NOT NULL,
      mermaid_diagram TEXT,
      total_weeks INTEGER DEFAULT 4,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS curriculum_weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      curriculum_id INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      objectives TEXT,
      concepts TEXT,
      prerequisites TEXT,
      topic_for_learning TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
      completed_at TEXT,
      FOREIGN KEY (curriculum_id) REFERENCES curricula(id),
      UNIQUE(curriculum_id, week_number)
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      curriculum_id INTEGER,
      week_number INTEGER,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

module.exports = { getDB };
