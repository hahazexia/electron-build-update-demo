import { contextBridge, ipcRenderer } from 'electron';
import {
  UpsertConfig,
  UpsertConfigRes,
  GetConfigRes,
  DeleteConfigRes,
  DeleteAllConfigRes,
} from './types/config.js';

contextBridge.exposeInMainWorld('ipc', {
  checkUpdate: (): void => {
    ipcRenderer.send('check-update');
  },
  getVersion: (): string => ipcRenderer.sendSync('get-version'),
  showUpdatePop: (callback: (val: boolean) => void): void => {
    ipcRenderer.on('show-update-pop', (_, val: boolean) => callback(val));
  },
  incrementalDownloadProgress: (callback: (val: number) => void): void => {
    ipcRenderer.on('incremental-download-progress', (_, val: number) =>
      callback(val)
    );
  },
  setConfig: (data: UpsertConfig): Promise<UpsertConfigRes> =>
    ipcRenderer.invoke('upsert-config', data),
  getConfig: (key: string): Promise<GetConfigRes> =>
    ipcRenderer.invoke('get-config', key),
  deleteConfig: (key: string): Promise<DeleteConfigRes> =>
    ipcRenderer.invoke('delete-config', key),
  deleteAllConfig: (): Promise<DeleteAllConfigRes> =>
    ipcRenderer.invoke('delete-all-config'),
});
