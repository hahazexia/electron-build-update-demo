import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

interface ExposedApi {
  v: () => any;
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
}

const api: ExposedApi = {
  v: () => ipcRenderer.sendSync('v'),
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    const listener = (_event: IpcRendererEvent, ...args: any[]) =>
      func(...args);
    ipcRenderer.on(channel, listener);
  },
};

contextBridge.exposeInMainWorld('api', api);

declare global {
  interface Window {
    api: ExposedApi;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const message = document.getElementById('message');

  if (message) {
    // 确保元素存在
    ipcRenderer.on('message', (_event: IpcRendererEvent, value: string) => {
      message.innerText = value;
    });
  } else {
    console.warn('Element with id "message" not found');
  }
});
