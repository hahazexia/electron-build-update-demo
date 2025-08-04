const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const {
  asarUpdateCheck,
  initFullUpdate,
  exitAndRunBatch,
} = require('./update.js');
const log = require('./logger.js');

// 捕获未处理的同步异常
process.on('uncaughtException', (error) => {
  log.error('捕获到未处理的异常:', error);
});

// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  log.error('捕获到未处理的Promise拒绝:', reason, promise);
});

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
      if (updataType.type === 'full') {
        autoUpdater.checkForUpdatesAndNotify();
      } else if (updataType.type === 'asar') {
        exitAndRunBatch(updataType.url);
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
