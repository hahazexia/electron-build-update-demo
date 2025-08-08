import log from './logger.js';
import { ipcMain } from 'electron';
import {
  UpsertConfig,
  UpsertConfigRes,
  GetConfigRes,
  DeleteConfigRes,
  DeleteAllConfigRes,
} from './types/config.js';
import { Config } from './entities/config.js';
import { logErrorInfo } from './utils.js';

export default function setupDbIpcEvents(): void {
  ipcMain.handle(
    'upsert-config',
    async (_, args: UpsertConfig): Promise<UpsertConfigRes> => {
      try {
        log.info('upsert-config');
        const configRepository = global.db.getRepository(Config);
        const upsertRes = await configRepository.upsert(args, {
          conflictPaths: ['key'],
          skipUpdateIfNoValuesChanged: true,
        });

        log.info(
          `upsert config successful upsertRes: ${JSON.stringify(
            upsertRes,
            () => {},
            2
          )}`
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
        const configRepository = global.db.getRepository(Config);
        const findedConfig = await configRepository.findOneBy({
          key: args,
        });

        log.info(`get config: ${JSON.stringify(findedConfig, () => {}, 2)}`);

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
        const configRepository = global.db.getRepository(Config);
        const configToDelete = await configRepository.findOneBy({
          key: args,
        });
        if (configToDelete) {
          await configRepository.remove(configToDelete);
        }
        return {
          msg: '',
          status: true,
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
      const configRepository = global.db.getRepository(Config);
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
