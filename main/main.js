const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { asarUpdateCheck, initFullUpdate } = require('./update.js');
const { getMajorPackageInfo, findAsarFilesInResources } = require('./utils.js');

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

    win.on('ready-to-show', async () => {
      log.info('start check updates');
      log.info(app.isPackaged, 'app.isPackaged');
      if (app.isPackaged) {
        const updataType = await asarUpdateCheck(sendStatusToWindow);
        log.info('updataType', updataType);
        log.info('autoUpdater', typeof autoUpdater);
        if (updataType === 'full') {
          autoUpdater.checkForUpdatesAndNotify();
        }
      }
    });
  };

  ipcMain.on('v', (e) => {
    const asarFiles = findAsarFilesInResources();
    let currentVersion;
    if (asarFiles.length === 1) {
      const pkg = getMajorPackageInfo(asarFiles[0]);
      currentVersion = pkg.version;
    } else if (asarFiles.length > 1) {
      const versionArr = asarFiles.map((i) => getMajorPackageInfo(i).version);
      versionArr.sort((a, b) => compareVersion(a, b));
      currentVersion = versionArr[versionArr.length - 1];
    } else {
      app.quit();
    }
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
};
