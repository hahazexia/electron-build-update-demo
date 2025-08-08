import { BrowserWindow } from 'electron';

declare global {
  var log: any;
  var win: BrowserWindow | null;
  var autoUpdater: any;
  var sendStatusToWindow: (text: string) => void;
  var db: DataSource;

  interface Window {
    ipc: {
      checkUpdate: () => void;
      showUpdatePop: (callback: (val: any) => void) => void;
      incrementalDownloadProgress: (callback: (val: any) => void) => void;
    };
  }
}
