import sqlite from 'better-sqlite3';
import { formatLocalTime } from '../utils.js';

const migrations = [
  {
    version: '0.0.19',
    up: (db: sqlite.Database) => {
      // if already have data in table
      // ALTER TABLE configs ADD COLUMN create_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')) will cause error below
      // Cannot add a column with non-constant default
      // db.exec(`
      //     ALTER TABLE configs
      //     ADD COLUMN create_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
      //   `);
      // db.exec(`
      //     ALTER TABLE configs
      //     ADD COLUMN update_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
      //   `);
      const now: string = formatLocalTime();
      global.log.info(`now: ${now}`);

      db.exec(`
          ALTER TABLE configs
          ADD COLUMN create_at TEXT NOT NULL DEFAULT '${now}'
        `);
      db.exec(`
          ALTER TABLE configs
          ADD COLUMN update_at TEXT NOT NULL DEFAULT '${now}'
        `);
    },
  },
];

export { migrations };
