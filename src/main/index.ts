import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asarUpdateCheck, initFullUpdate, exitAndRunBatch } from './update.js';
import log from './logger.js';

const dotenv = require('dotenv');

dotenv.config({
  path: app.isPackaged ? path.join(app.getAppPath(), '.env') : '../../.env',
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', error => {
  log.error('catch unhandled error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('catch unhandled promise eject:', reason, promise);
});

log.info('App starting...');
function sendStatusToWindow(text: string) {
  log.info(text);
  win?.webContents.send('message', text);
}

global.log = log;
global.sendStatusToWindow = sendStatusToWindow;

const autoUpdater = initFullUpdate();
let win: BrowserWindow | null = null;

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  global.win = win;

  const html = path.join(__dirname, '../renderer/index.html');
  log.info(html, 'html');
  win.loadFile(html);
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

ipcMain.on('v', e => {
  let currentVersion = app.getVersion();
  e.returnValue = currentVersion;
});

ipcMain.on('check-update', e => {
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
