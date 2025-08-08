import 'reflect-metadata';
import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeDatabase } from './db.js';
import { initFullUpdate } from './update.js';
import setupDbIpcEvents from './dbIpc.js';
import setupIpcEvents from './ipc.js';
import log from './logger.js';
import dotenv from 'dotenv';

log.info('App starting...');
global.log = log;
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

Menu.setApplicationMenu(null);

await initializeDatabase();
initFullUpdate();
setupIpcEvents();
setupDbIpcEvents();

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  global.win = win;

  const html = path.join(__dirname, 'index.html');
  log.info(html, 'html');
  win.loadFile(html);
  win.webContents.openDevTools();

  win.on('ready-to-show', async () => {
    log.info('start check updates');
    log.info(app.isPackaged, 'app.isPackaged');
  });
};

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
