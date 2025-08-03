const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const {
  asarUpdateCheck,
  initFullUpdate,
  exitAndRunBatch,
} = require('./update.js');
const log = require('./logger.js');

log.info('App starting...');
function sendStatusToWindow(text) {
  log.info(text);
  win.webContents.send('message', text);
}

global.log = log;
global.sendStatusToWindow = sendStatusToWindow;

const autoUpdater = initFullUpdate(sendStatusToWindow);
let win;

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

  win.on('ready-to-show', async () => {
    log.info('start check updates');
    log.info(app.isPackaged, 'app.isPackaged');
    if (app.isPackaged) {
      const updataType = await asarUpdateCheck();
      log.info('updataType', updataType);
      if (updataType === 'full') {
        autoUpdater.checkForUpdatesAndNotify();
      } else if (updataType === 'asar') {
        exitAndRunBatch();
      }
    }
  });
};

ipcMain.on('v', (e) => {
  let currentVersion = app.getVersion();
  e.returnValue = currentVersion;
});

ipcMain.on('check-update', (e) => {
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('something', () => {
  console.log('do something');
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
