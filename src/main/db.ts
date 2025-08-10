import sqlite from 'better-sqlite3';
import { ConfigModel } from './entities/config.js';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { logErrorInfo } from './utils.js';
import { ModelConstructor } from './orm.js';

type TableMap = {
  configs: ConfigModel;
};

export class DB {
  db: sqlite.Database;
  tables: Map<keyof TableMap, ModelConstructor<any>> = new Map();

  constructor(dbPath: string, options: sqlite.Options) {
    const db = new sqlite(dbPath, { verbose: console.log, ...options });
    this.db = db;
  }

  init(models: ModelConstructor<any>[]) {
    models.forEach((model: ModelConstructor<any>) => {
      model.setDB(this.db);
      model.createTable();
      this.tables.set(model.table as keyof TableMap, model);
    });
  }
  getTable<K extends keyof TableMap>(
    name: K
  ): ModelConstructor<any> | undefined {
    return this.tables.get(name) as ModelConstructor<any> | undefined;
  }
}

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

export function initializeDatabase(): null | DB {
  if (alreadyInitialized) {
    return global.db;
  }
  let db;
  try {
    db = new DB(getDatabasePath(), { verbose: global.log.info });
    db.init([ConfigModel]);
  } catch (err) {
    logErrorInfo('db initialize failed', err);
    return null;
  }
  log.info(`db initialize successful`);
  global.db = db;
  alreadyInitialized = true;

  return db;
}
