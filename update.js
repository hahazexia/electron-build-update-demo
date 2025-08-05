import fs from 'fs-extra';
import axios from 'axios';
import path from 'node:path';
import compareVersion from 'compare-version';
import { app } from 'electron';
import electronUpdater from 'electron-updater';
import { spawn } from 'child_process';
import iconv from 'iconv-lite';

const { autoUpdater } = electronUpdater;

export async function downloadAsarFile(
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
    await fs.ensureDir(targetDir);

    const originalFileName = path.basename(url);
    const tmpFileName = `${originalFileName}.tmp`;
    const tmpFilePath = path.join(targetDir, tmpFileName);
    log.info(`tmpFilePath: ${tmpFilePath}`);

    const headResponse = await axios.head(url);
    const fileSize = parseInt(headResponse.headers['content-length'], 10);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': `Electron/${app.getVersion()} (${process.platform})`,
      },
    });

    const writer = fs.createWriteStream(tmpFilePath);
    response.data.pipe(writer);

    let downloadedSize = 0;
    response.data.on('data', chunk => {
      downloadedSize += chunk.length;
      const progress = fileSize ? downloadedSize / fileSize : 0;
      if (progressCallback && typeof progressCallback === 'function') {
        progressCallback(progress);
      }
    });

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', error => {
        fs.unlink(tmpFilePath).catch(() => {});
        reject(new Error(`download asar failed: ${error.message}`));
      });
    });

    const stats = await fs.stat(tmpFilePath);
    if (fileSize && stats.size !== fileSize) {
      await fs.unlink(tmpFilePath);
      throw new Error(
        'downloaded asar file is incomplete and the size does not match'
      );
    }

    let finalFilePath = tmpFilePath;
    if (!keepTmp) {
      finalFilePath = path.join(targetDir, originalFileName);
      if (await fs.pathExists(finalFilePath)) {
        await fs.unlink(finalFilePath);
      }
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

export async function asarUpdateCheck() {
  const log = global.log;
  log.info(process.env.UPDATE_SERVER_URL, 'process.env.UPDATE_SERVER_URL');
  const res = await axios.get(`${process.env.UPDATE_SERVER_URL}/update.json`);
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
      return {
        type: 'full',
        url: '',
      };
    } else {
      log.info('new version is asar');
      // check if there is on full between latest and current, then will be full update not asar
      const currentIndex = res.data.findIndex(
        i => i.version === currentVersion
      );
      log.info('currentIndex', currentIndex);
      const filterData = res.data.slice(1, currentIndex);
      log.info('filterData', filterData);
      log.info(
        `filterData.some((i) => i.type === 'full')`,
        filterData.some(i => i.type === 'full')
      );
      if (filterData.some(i => i.type === 'full')) {
        return {
          type: 'full',
          url: '',
        };
      }
      log.info(`start download asar update ${latest.name}`);
      const targetDir = app.isPackaged
        ? path.join(path.dirname(app.getAppPath()))
        : path.join(app.getAppPath());
      await downloadAsarFile(
        `${process.env.UPDATE_SERVER_URL}/${latest.name}`,
        targetDir,
        () => {}
      );
      return {
        type: 'asar',
        url: path.join(targetDir, latest.name),
      };
    }
  } else {
    global.sendStatusToWindow('update not available.');
    return {
      type: 'null',
      url: '',
    };
  }
}

export function exitAndRunBatch(newAsarPath) {
  const log = global.log;
  try {
    const exePath = process.execPath;
    const resourcesPath = path.dirname(app.getAppPath());
    const appAsarPath = path.join(resourcesPath, 'app.asar');
    const batPath = path.join(resourcesPath, 'update.bat');

    log.info(
      `resourcesPath: ${resourcesPath}, newAsarPath: ${newAsarPath}, appAsarPath: ${appAsarPath}, exePath: ${exePath}`
    );

    const batContent =
      '@echo off\r\n' +
      'chcp 936 >nul 2>&1\r\n' +
      '\r\n' +
      ':: wait 3 seconds ensure main process exit\r\n' +
      'timeout /t 3 /nobreak >nul\r\n' +
      '\r\n' +
      ':: loop wait asar file unlock\r\n' +
      'if exist "' +
      appAsarPath +
      '" (\r\n' +
      '    :WAIT_DELETE\r\n' +
      '    del "' +
      appAsarPath +
      '" >nul 2>&1\r\n' +
      '    if %errorlevel% equ 0 (\r\n' +
      '        goto DELETE_SUCCESS\r\n' +
      '    ) else (\r\n' +
      '        timeout /t 1 /nobreak >nul\r\n' +
      '        goto WAIT_DELETE\r\n' +
      '    )\r\n' +
      ')\r\n' +
      ':DELETE_SUCCESS\r\n' +
      '\r\n' +
      ':: move new file\r\n' +
      'move "' +
      newAsarPath +
      '" "' +
      appAsarPath +
      '"\r\n' +
      '\r\n' +
      ':: relaunch app\r\n' +
      'start "" "' +
      exePath +
      '"\r\n' +
      '\r\n' +
      ':: delete bat script self\r\n' +
      'del "%~f0" >nul 2>&1\r\n';

    const buffer = iconv.encode(batContent, 'gbk');
    fs.writeFileSync(batPath, buffer);

    const out = fs.openSync(path.join(resourcesPath, './out.log'), 'a');
    const err = fs.openSync(path.join(resourcesPath, './out.log'), 'a');

    const child = spawn(batPath, [], {
      cwd: resourcesPath,
      detached: true,
      shell: true,
      stdio: ['ignore', out, err],
      windowsHide: true,
    });
    child.on('spawn', e => {
      log.info('child process start successful');
      app.quit();
    });
    child.on('error', err => {
      log.error({
        errorSummary: 'child failed',
        message: err.message,
        code: err.code,
        signal: err.signal,
        cmd: err.cmd,
        stack: err.stack,
      });
    });
    child.unref();

    return true;
  } catch (error) {
    log.error('bat script run failed:', error);
    return false;
  }
}

export function initFullUpdate() {
  const log = global.log;
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.autoInstallOnAppQuit = false;
  // autoUpdater.disableDifferentialDownload = true;

  autoUpdater.on('checking-for-update', () => {
    global.sendStatusToWindow('Checking for update...');
  });
  autoUpdater.on('update-available', info => {
    global.sendStatusToWindow('Update available.');
  });
  autoUpdater.on('update-not-available', info => {
    global.sendStatusToWindow('Update not available.');
  });
  autoUpdater.on('error', err => {
    global.sendStatusToWindow('Error in auto-updater. ' + err);
  });
  autoUpdater.on('download-progress', progressObj => {
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
  autoUpdater.on('update-downloaded', info => {
    global.sendStatusToWindow('Update downloaded');
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 4000);
  });

  return autoUpdater;
}
