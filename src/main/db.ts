import sqlite from 'better-sqlite3';
import { ConfigModel } from './entities/config.js';
import { DBVersionModel } from './entities/db_version.js';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { compareVersion } from './utils.js';
import { logErrorInfo } from './utils.js';
import { ModelConstructor } from './orm.js';
import { migrations } from './migrations.js';

type TableMap = {
  configs: ConfigModel;
  db_version: DBVersionModel;
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

  upgrade() {
    const dbVersionRepository: ModelConstructor<any> | undefined =
      this.getTable('db_version');
    if (dbVersionRepository) {
      const allDBVersions = dbVersionRepository.findAll();
      log.info(`db upgrade allDBVersions: ${JSON.stringify(allDBVersions)}`);

      let currentDBVersion = '';

      if (allDBVersions.length > 0) {
        currentDBVersion = allDBVersions[0].version;
        log.info(`db upgrade currentDBVersion: ${currentDBVersion}`);
      } else {
        const newDBVersion = dbVersionRepository.upsert(
          {
            version: '0.0.0',
          },
          {
            conflictPaths: ['version'],
            skipUpdateIfNoValuesChanged: true,
          }
        );
        currentDBVersion = newDBVersion.version;
        log.info(`db upgrade first insert db version 0.0.0`);
      }
      const filteredMigrations = migrations.filter(
        i => compareVersion(i.version, currentDBVersion) > 0
      );
      log.info(
        `db upgrade filteredMigrations: ${JSON.stringify(filteredMigrations)}`
      );
      const sortMigrations = filteredMigrations.sort((a, b) =>
        compareVersion(a.version, b.version)
      );
      log.info(`db upgrade sortMigrations: ${JSON.stringify(sortMigrations)}`);

      if (sortMigrations.length <= 0) {
        log.info(`db current is latest version`);
        return;
      }

      for (const upgrade of sortMigrations) {
        upgrade.up(this.db);
      }
      log.info(`db upgrade successful current version: ${app.getVersion()}`);

      dbVersionRepository.deleteAll();
      dbVersionRepository.upsert(
        {
          version: app.getVersion(),
        },
        {
          conflictPaths: ['version'],
          skipUpdateIfNoValuesChanged: true,
        }
      );
    }
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
    db.init([ConfigModel, DBVersionModel]);
    db.upgrade();
  } catch (err) {
    logErrorInfo('db initialize failed', err);
    return null;
  }
  log.info(`db initialize successful`);
  global.db = db;
  alreadyInitialized = true;

  return db;
}
