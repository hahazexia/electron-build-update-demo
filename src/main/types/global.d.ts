import { BrowserWindow } from 'electron';
import { DB } from '../db/db';

declare global {
  var log: any;
  var win: BrowserWindow | null;
  var synthWin: BrowserWindow | null;
  var autoUpdater: any;
  var sendStatusToWindow: (text: string) => void;
  var db: DB;

  interface Window {
    ipc: {
      checkUpdate: () => void;
      showUpdatePop: (callback: (val: any) => void) => void;
      incrementalDownloadProgress: (callback: (val: any) => void) => void;
    };
  }
}
