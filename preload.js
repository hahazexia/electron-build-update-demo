const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  v: () => ipcRenderer.sendSync('v'),
  send: (channel, data) => {
    ipcRenderer.send(channel, data)
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args))
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const message = document.getElementById('message');
  ipcRenderer.on('message', (_event, value) => {
    message.innerText = value;
  });
});
