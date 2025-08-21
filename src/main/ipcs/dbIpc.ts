import log from '../logger.js';
import { ipcMain } from 'electron';
import {
  UpsertConfig,
  UpsertConfigRes,
  GetConfigRes,
  DeleteConfigRes,
  DeleteAllConfigRes,
} from '../db/types/config.js';
import { logErrorInfo } from '../utils.js';
import { ModelInstance } from '../db/orm.js';

export default function setupDbIpcEvents(): void {
  ipcMain.handle(
    'upsert-config',
    async (_, args: UpsertConfig): Promise<UpsertConfigRes> => {
      try {
        log.info('upsert-config');
        const configRepository: ModelInstance<any> =
          global.db.getTable('configs');
        const upsertRes = await configRepository.upsert(args, {
          conflictPaths: ['key'],
          skipUpdateIfNoValuesChanged: true,
        });

        log.info(
          `upsert config successful upsertRes: ${JSON.stringify(upsertRes)}`
        );

        return {
          msg: '',
          status: true,
        };
      } catch (err: any) {
        logErrorInfo('upsert config failed', err);
        return {
          msg: `upsert config failed: ${err.message}`,
          status: false,
        };
      }
    }
  );

  ipcMain.handle(
    'get-config',
    async (_, args: string): Promise<GetConfigRes> => {
      try {
        log.info('get-config');
        const configRepository: ModelInstance<any> =
          global.db.getTable('configs');
        const findedConfig = await configRepository.findOneBy({
          key: args,
        });

        log.info(`get config: ${JSON.stringify(findedConfig)}`);

        return {
          status: true,
          msg: '',
          data: findedConfig,
        };
      } catch (err: any) {
        logErrorInfo('get config failed', err);
        return {
          status: false,
          msg: `get config failed: ${err.message}`,
          data: null,
        };
      }
    }
  );

  ipcMain.handle(
    'delete-config',
    async (_, args: string): Promise<DeleteConfigRes> => {
      try {
        log.info('delete-config');
        const configRepository: ModelInstance<any> =
          global.db.getTable('configs');
        const deleteRes = await configRepository.deleteOneBy({
          key: args,
        });
        return {
          msg: '',
          status: deleteRes,
        };
      } catch (err: any) {
        logErrorInfo('delete config failed', err);
        return {
          msg: `delete config failed: ${err.message}`,
          status: false,
        };
      }
    }
  );

  ipcMain.handle('delete-all-config', async (): Promise<DeleteAllConfigRes> => {
    try {
      log.info('delete-all-config');
      const configRepository: ModelInstance<any> =
        global.db.getTable('configs');
      const deleteRes = await configRepository.deleteAll();

      log.info(`delete all successful Res: ${deleteRes}`);
      return {
        msg: '',
        status: true,
      };
    } catch (err: any) {
      logErrorInfo('delete all config failed', err);
      return {
        msg: `delete all config failed: ${err.message}`,
        status: false,
      };
    }
  });
}
