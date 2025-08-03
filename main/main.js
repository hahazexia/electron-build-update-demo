const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { asarUpdateCheck, initFullUpdate } = require('./update.js');

module.exports = async function (log) {
  global.log = log;
  log.info('App starting...');
  let win;
  function sendStatusToWindow(text) {
    log.info(text);
    win.webContents.send('message', text);
  }
  const autoUpdater = initFullUpdate(sendStatusToWindow);

  const createWindow = () => {
    win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    win.loadFile(path.join(__dirname, 'index.html'));
    win.webContents.openDevTools();

    win.on('ready-to-show', () => {
      log.info('start check updates');
      log.info(app.isPackaged, 'app.isPackaged');
      if (app.isPackaged) {
        const updataType = asarUpdateCheck(sendStatusToWindow);
        if (updataType === 'full') {
          autoUpdater.checkForUpdatesAndNotify();
        }
      }
    });
  };

  ipcMain.on('v', (e) => {
    console.log(app.getVersion(), 'app.getVersion()');
    e.returnValue = app.getVersion();
  });

  ipcMain.on('check-update', (e) => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  app.whenReady().then(() => {
    createWindow();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
};
