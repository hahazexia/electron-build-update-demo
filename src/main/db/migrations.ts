import sqlite from 'better-sqlite3';

const migrations = [
  {
    version: '0.0.19',
    up: (db: sqlite.Database) => {
      db.exec(`
          ALTER TABLE configs
          ADD COLUMN create_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
        `);
      db.exec(`
          ALTER TABLE configs
          ADD COLUMN update_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
        `);
    },
  },
];

export { migrations };
