import sqlite from 'better-sqlite3';
import { ConfigModel } from './entities/config.js';
import { DBVersionModel } from './entities/db_version.js';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { compareVersion } from '../utils.js';
import { logErrorInfo } from '../utils.js';
import { ModelConstructor } from './orm.js';
import { migrations } from './migrations.js';

type TableMap = {
  configs: ConfigModel;
  db_version: DBVersionModel;
};

type NeedUpgrade = {
  res: boolean;
  migrations: any[];
};

export class DB {
  db: sqlite.Database;
  dbPath: string;
  currentDBVersion: string | undefined;
  backupDBForUpgradePath: string | undefined;
  tables: Map<keyof TableMap, ModelConstructor<any>> = new Map();

  constructor(options: sqlite.Options) {
    const dbPath = this.getDatabasePath();
    const db = new sqlite(dbPath, { verbose: console.log, ...options });
    this.db = db;
    this.dbPath = dbPath;
  }

  getDatabasePath(): string {
    if (this.dbPath) {
      return this.dbPath;
    }
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'database');

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'app.db');
    log.info(`dbPath: ${dbPath}`);

    return dbPath;
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
    return this.tables.get(name);
  }

  backupDBForUpgrade() {
    const backupPath = `${this.dbPath}.backup-${new Date().getTime()}`;
    try {
      fs.copyFileSync(this.dbPath, backupPath);
      this.backupDBForUpgradePath = backupPath;
      console.log(`backup DB file for upgrade successfule：${backupPath}`);
    } catch (err) {
      logErrorInfo('backup DB file for upgrade failed:', err);
    }
  }

  restoreBackup() {
    const backupFiles = fs.readdirSync(path.dirname(this.dbPath))
      .filter(f => f.startsWith(path.basename(this.dbPath) + '.backup-'))
      .sort((a, b) => b.localeCompare(a));

    if (backupFiles.length === 0) {
      log.error(`no backup DB file`);
      return;
    }

    const latestBackup = path.join(path.dirname(this.dbPath), backupFiles[0]);
    try {
      fs.copyFileSync(latestBackup, this.dbPath);
      console.log(`restore backup successful：${latestBackup}`);
    } catch (err) {
      logErrorInfo('restore backup failed:', err);
    }
  }

  checkUpgrade(): NeedUpgrade {
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
      this.currentDBVersion = currentDBVersion;
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
        return {
          res: false,
          migrations: []
        };
      }
      return {
        res: true,
        migrations: sortMigrations
      };;
    } else {
      return {
        res: false,
        migrations: []
      };
    }
  }

  upgrade() {
    const { res, migrations } = this.checkUpgrade();
    if (res) {
      const dbVersionRepository: ModelConstructor<any> | undefined =
        this.getTable('db_version');

      if (dbVersionRepository) {
        this.backupDBForUpgrade();

        let hasErr: boolean = false;

        for (const upgrade of migrations) {
          try {
            log.info(`upgrade version ${upgrade.version} begain`);
            const transaction = this.db.transaction(() => {
              upgrade.up(this.db);
            });
            transaction();
          } catch (err) {
            hasErr = true;
            log.error(`upgrade version ${upgrade.version} failed`);
            log.error(`will roll back to version ${this.currentDBVersion}`);
            this.restoreBackup();
            break;
          }
        }
        if (!hasErr) {
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
  }
}


let alreadyInitialized = false;

export function initializeDatabase(): null | DB {
  if (alreadyInitialized) {
    return global.db;
  }
  let db;
  try {
    db = new DB({ verbose: global.log.info });
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
