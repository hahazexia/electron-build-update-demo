import { app, ipcMain } from 'electron';
import log from './logger.js';
import { asarUpdateCheck, exitAndRunBatch } from './update.js';
import { UpdateType } from './types/update.js';

export default function setupIpcEvents(): void {
  ipcMain.on('check-update', async (): Promise<void> => {
    log.info('start check updates');
    if (app.isPackaged) {
      const updataType: UpdateType = await asarUpdateCheck();
      log.info('updataType', updataType);

      if (updataType.type === 'full') {
        global.autoUpdater?.checkForUpdatesAndNotify();
      } else if (updataType.type === 'asar') {
        if (updataType.url) {
          exitAndRunBatch(updataType.url);
        }
      }
    }
  });
  ipcMain.on('get-version', e => {
    let currentVersion = app.getVersion();
    e.returnValue = currentVersion;
  });

  ipcMain.on('exit', (): void => {
    global.win?.hide();
  });
}
