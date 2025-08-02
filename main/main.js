const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const axios = require('axios');
const compareVersion = require('compare-version');
const fs = require('fs-extra');

module.exports = async function (log) {
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.autoInstallOnAppQuit = false;
  // autoUpdater.disableDifferentialDownload = true;
  log.info('App starting...');
  let win;

  async function downloadAsarFile(
    url,
    targetDir,
    progressCallback,
    keepTmp = false
  ) {
    try {
      log.info(
        JSON.stringify(
          {
            url,
            targetDir,
            progressCallback,
            keepTmp,
          },
          undefined,
          2
        )
      );
      // 确保目标目录存在
      await fs.ensureDir(targetDir);

      // 从URL中提取文件名并创建临时文件名
      const originalFileName = path.basename(url);
      const tmpFileName = `${originalFileName}.tmp`; // 临时文件名
      const tmpFilePath = path.join(targetDir, tmpFileName); // 临时文件路径

      // 发送HEAD请求获取文件大小
      const headResponse = await axios.head(url);
      const fileSize = parseInt(headResponse.headers['content-length'], 10);

      // 发送GET请求，以流的方式接收响应
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': `Electron/${app.getVersion()} (${process.platform})`,
        },
      });

      // 创建可写流，写入临时文件
      const writer = fs.createWriteStream(tmpFilePath);
      response.data.pipe(writer);

      // 监听下载进度
      let downloadedSize = 0;
      response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = fileSize ? downloadedSize / fileSize : 0;
        if (progressCallback && typeof progressCallback === 'function') {
          progressCallback(progress);
        }
      });

      // 等待文件写入完成
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (error) => {
          // 清理临时文件
          fs.unlink(tmpFilePath).catch(() => {});
          reject(new Error(`文件写入失败: ${error.message}`));
        });
      });

      // 验证文件完整性
      const stats = await fs.stat(tmpFilePath);
      if (fileSize && stats.size !== fileSize) {
        await fs.unlink(tmpFilePath);
        throw new Error('下载的文件不完整，大小不匹配');
      }

      // 根据需求决定是否保留.tmp后缀
      let finalFilePath = tmpFilePath;
      if (!keepTmp) {
        finalFilePath = path.join(targetDir, originalFileName);
        // 如果目标文件已存在，先删除
        if (await fs.pathExists(finalFilePath)) {
          await fs.unlink(finalFilePath);
        }
        // 重命名临时文件为原始文件名
        await fs.rename(tmpFilePath, finalFilePath);
      }

      log.info(`asar文件下载完成: ${finalFilePath}`);
      return finalFilePath;
    } catch (error) {
      log.error('asar文件下载失败:', error.message);
      throw error;
    }
  }

  function findAsarFilesInResources() {
    try {
      const resourcesPath = path.dirname(app.getAppPath());
      log.log('resources目录路径:', resourcesPath);

      const files = fs.readdirSync(resourcesPath, { withFileTypes: true });

      const asarFiles = files
        .filter(
          (item) =>
            !item.isDirectory() &&
            item.name.includes('asar') &&
            item.name !== 'app.asar'
        )
        .map((item) => path.join(resourcesPath, item.name));

      log.log(`找到${asarFiles.length}个含asar的文件:`);
      asarFiles.forEach((file) => log.log(`- ${file}`));

      return asarFiles;
    } catch (error) {
      log.error('获取asar文件失败:', error.message);
      return [];
    }
  }

  function getMajorPackageInfo(mainAsarPath) {
    try {
      let pkgPath;

      if (!app.isPackaged) {
        pkgPath = path.join(__dirname, './package.json');
      } else {
        pkgPath = path.join(mainAsarPath, 'package.json');
      }

      const pkgContent = fs.readFileSync(pkgPath, 'utf8');
      return JSON.parse(pkgContent);
    } catch (error) {
      log.error('读取package.json失败:', error);
      return {
        name: 'unknown-app',
        version: '0.0.0',
      };
    }
  }

  const newUpdater = {
    check: async () => {
      const res = await axios.get('http://127.0.0.1:33855/update.json');
      log.info(res.data, 'update.json res');

      const latest = res.data[0];
      log.info(latest, 'latest');

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
      log.info(
        `currentVersion: ${currentVersion} latest.version: ${latest.version}`
      );
      const compareRes = compareVersion(latest.version, currentVersion);

      if (compareRes === 1) {
        sendStatusToWindow('New Version found.');
        if (latest.type === 'full') {
          autoUpdater.checkForUpdatesAndNotify();
        } else {
          log.info(`开始下载 asar 增量 ${latest.name}`);
          const targetDir = app.isPackaged
            ? path.join(path.dirname(app.getAppPath()))
            : path.join(app.getAppPath());
          const tempPath = await downloadAsarFile(
            `http://127.0.0.1:33855/${latest.name}`,
            targetDir,
            () => {},
            true
          );
          sendStatusToWindow('asar 增量下载成功');
        }
      } else {
        sendStatusToWindow('Update not available.');
      }
    },
  };

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
        newUpdater.check();
      }
      // autoUpdater.checkForUpdatesAndNotify();
    });
  };

  function sendStatusToWindow(text) {
    log.info(text);
    win.webContents.send('message', text);
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...');
  });
  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available.');
  });
  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.');
  });
  autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + err);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message =
      log_message +
      ' (' +
      progressObj.transferred +
      '/' +
      progressObj.total +
      ')';
    sendStatusToWindow(log_message);
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Update downloaded');
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 4000);
  });

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
