import { DataSource } from 'typeorm';
import { Config } from './entities/config.js';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { logErrorInfo } from './utils.js';

function getDatabasePath() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'database');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'app.db');
  log.info(`dbPath: ${dbPath}`);

  return dbPath;
}

let alreadyInitialized = false;

export async function initializeDatabase(): Promise<null | DataSource> {
  if (alreadyInitialized) {
    return global.db;
  }
  const db = new DataSource({
    type: 'better-sqlite3',
    database: getDatabasePath(),
    entities: [Config],
    synchronize: true,
    logging: false,
  });
  try {
    await db.initialize();
  } catch (err) {
    logErrorInfo('db initialize failed', err);
    return null;
  }
  log.info(`db initialize successful`);
  global.db = db;
  alreadyInitialized = true;

  return db;
}
