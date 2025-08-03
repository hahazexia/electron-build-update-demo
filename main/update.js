const fs = require('fs-extra');
const axios = require('axios');
const path = require('node:path');
const compareVersion = require('compare-version');
const { app } = require('electron');
const { getMajorPackageInfo, findAsarFilesInResources } = require('./utils.js');
const { autoUpdater } = require('electron-updater');

async function downloadAsarFile(
  url,
  targetDir,
  progressCallback,
  keepTmp = false,
  sendStatusToWindow
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

    sendStatusToWindow(`asar download complete: ${finalFilePath}`);
    return finalFilePath;
  } catch (error) {
    log.error('asar download failed:', error.message);
    sendStatusToWindow('asar download failed:');
    throw error;
  }
}

exports.asarUpdateCheck = async function asarUpdateCheck(sendStatusToWindow) {
  const log = global.log;
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
      return 'full';
    } else {
      // check if there is on full between latest and current, then will be full update not asar
      const currentIndex = res.data.findIndex(
        (i) => i.version === currentVersion
      );
      const filterData = res.data.slice(1, currentIndex);
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
        () => {},
        true,
        sendStatusToWindow
      );
    }
    return 'asar';
  } else {
    sendStatusToWindow('update not available.');
    return false;
  }
};

exports.initFullUpdate = function fullUpdate(sendStatusToWindow) {
  const log = global.log;
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.autoInstallOnAppQuit = false;
  // autoUpdater.disableDifferentialDownload = true;

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

  return autoUpdater;
};
