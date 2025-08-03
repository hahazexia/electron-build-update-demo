const fs = require('fs-extra');
const axios = require('axios');
const path = require('node:path');
const compareVersion = require('compare-version');
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');

async function downloadAsarFile(
  url,
  targetDir,
  progressCallback,
  keepTmp = false
) {
  const log = global.log;
  try {
    log.info(
      JSON.stringify(
        {
          logContent: 'downloadAsarFile params',
          url,
          targetDir,
          progressCallback,
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
    log.info(`tmpFilePath: ${tmpFilePath}`);

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
        reject(new Error(`download asar failed: ${error.message}`));
      });
    });

    // 验证文件完整性
    const stats = await fs.stat(tmpFilePath);
    if (fileSize && stats.size !== fileSize) {
      await fs.unlink(tmpFilePath);
      throw new Error(
        'downloaded asar file is incomplete and the size does not match'
      );
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

    log.info(`asar download complete: ${finalFilePath}`);

    global.sendStatusToWindow(`asar download complete: ${finalFilePath}`);
    return tmpFilePath;
  } catch (error) {
    log.error('asar download failed:', error.message, error.stack, error);
    global.sendStatusToWindow('asar download failed:');
    throw error;
  }
}

exports.asarUpdateCheck = async function asarUpdateCheck() {
  const log = global.log;
  const res = await axios.get('http://127.0.0.1:33855/update.json');
  log.info(res.data, 'update.json res');

  const latest = res.data[0];
  log.info(latest, 'latest');

  let currentVersion = app.getVersion();
  log.info(
    `currentVersion: ${currentVersion} latest.version: ${latest.version}`
  );

  const compareRes = compareVersion(latest.version, currentVersion);
  if (compareRes === 1) {
    global.sendStatusToWindow('New Version found.');
    if (latest.type === 'full') {
      log.info('new version is full');
      return 'full';
    } else {
      log.info('new version is asar');
      // check if there is on full between latest and current, then will be full update not asar
      const currentIndex = res.data.findIndex(
        (i) => i.version === currentVersion
      );
      log.info('currentIndex', currentIndex);
      const filterData = res.data.slice(1, currentIndex);
      log.info('filterData', filterData);
      log.info(
        `filterData.some((i) => i.type === 'full')`,
        filterData.some((i) => i.type === 'full')
      );
      if (filterData.some((i) => i.type === 'full')) {
        return 'full';
      }
      log.info(`start download asar update ${latest.name}`);
      const targetDir = app.isPackaged
        ? path.join(path.dirname(app.getAppPath()))
        : path.join(app.getAppPath());
      await downloadAsarFile(
        `http://127.0.0.1:33855/${latest.name}`,
        targetDir,
        () => {}
      );
    }
    return 'asar';
  } else {
    global.sendStatusToWindow('update not available.');
    return false;
  }
};

exports.exitAndRunBatch = function exitAndRunBatch() {
  const log = global.log;
  const appPid = process.pid;
  const resourcesPath = path.dirname(app.getAppPath());
  const fullBatchPath = path.resolve(resourcesPath, './asarUpdate.bat');
  const processName = path.basename(process.execPath);

  log.info(
    `pid: ${appPid} fullBatchPath: ${fullBatchPath} processName: ${processName} resourcesPath: ${resourcesPath}`
  );
  let watcherScript = `
      @echo off

      :: 等待主进程退出
      :waitloop
      tasklist /FI "PID eq ${appPid}" 2>NUL | find /I /N "${processName}">NUL
      if "%ERRORLEVEL%"=="0" goto waitloop

      :: 这里可以添加额外的延时，确保完全退出
      timeout /t 2 /nobreak > NUL

      :: 切换到resources目录并执行更新脚本
      cd /d "${resourcesPath}"
      call "${fullBatchPath}"
    `;

  const watcher = spawn('cmd.exe', ['/c', watcherScript], {
    detached: true,
    stdio: 'ignore',
  });

  watcher.unref();

  app.quit();
};

exports.initFullUpdate = function fullUpdate() {
  const log = global.log;
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.autoInstallOnAppQuit = false;
  // autoUpdater.disableDifferentialDownload = true;

  autoUpdater.on('checking-for-update', () => {
    global.sendStatusToWindow('Checking for update...');
  });
  autoUpdater.on('update-available', (info) => {
    global.sendStatusToWindow('Update available.');
  });
  autoUpdater.on('update-not-available', (info) => {
    global.sendStatusToWindow('Update not available.');
  });
  autoUpdater.on('error', (err) => {
    global.sendStatusToWindow('Error in auto-updater. ' + err);
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
    global.sendStatusToWindow(log_message);
  });
  autoUpdater.on('update-downloaded', (info) => {
    global.sendStatusToWindow('Update downloaded');
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 4000);
  });

  return autoUpdater;
};
