import fs from 'node:fs';
import fsp from 'node:fs/promises';
import axios, { AxiosResponse } from 'axios';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import {
  logErrorInfo,
  compareVersion,
  pathExists,
  ensureDir,
} from './utils.js';
import { UpdateItem } from './types/update.js';
import electronUpdater from 'electron-updater';
import iconv from 'iconv-lite';

const autoUpdater = electronUpdater.autoUpdater;

export async function downloadAsarFile(
  url: string,
  targetDir: string,
  progressCallback: (progress: number) => void,
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
    await ensureDir(targetDir);

    const originalFileName = path.basename(url);
    const tmpFileName = `${originalFileName}.tmp`;
    const tmpFilePath = path.join(targetDir, tmpFileName);
    log.info(`tmpFilePath: ${tmpFilePath}`);

    const headResponse = await axios.head(url);
    const fileSize = parseInt(headResponse.headers['content-length'], 10);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': `Electron/${app.getVersion()} (${process.platform})`,
      },
      onDownloadProgress: progressEvent => {
        if (
          progressEvent.total &&
          progressCallback &&
          typeof progressCallback === 'function'
        ) {
          const progress = progressEvent.loaded / progressEvent.total;
          progressCallback(progress);
        }
      },
    });

    const buffer = Buffer.from(response.data);

    try {
      await fs.promises.writeFile(tmpFilePath, buffer);
    } catch (error) {
      try {
        await fs.promises.unlink(tmpFilePath);
      } catch (cleanupError) {
        logErrorInfo('Cleanup failed after download error:', cleanupError);
      }
      throw new Error(`download asar failed: ${(error as Error).message}`);
    }

    const stats = await fsp.stat(tmpFilePath);
    if (fileSize && stats.size !== fileSize) {
      await fsp.unlink(tmpFilePath);
      throw new Error(
        'downloaded asar file is incomplete and the size does not match'
      );
    }

    let finalFilePath = tmpFilePath;
    if (!keepTmp) {
      finalFilePath = path.join(targetDir, originalFileName);
      if (await pathExists(finalFilePath)) {
        await fsp.unlink(finalFilePath);
      }
      await fsp.rename(tmpFilePath, finalFilePath);
    }

    log.info(`asar download complete: ${finalFilePath}`);

    log.info(`asar download complete: ${finalFilePath}`);
    return tmpFilePath;
  } catch (err) {
    logErrorInfo('asar download failed error: ', err);
    log.info('asar download failed:');
    throw err;
  }
}

export async function asarUpdateCheck() {
  const log = global.log;
  let res: AxiosResponse;
  try {
    res = await axios.get(`${process.env.UPDATE_SERVER_URL}/update.json`);
  } catch (err) {
    logErrorInfo('asarUpdateCheck get request error', err);
    return {
      type: 'null',
      url: '',
    };
  }
  log.info(res.data, 'update.json res');

  const latest: UpdateItem = res.data[0];
  log.info(latest, 'latest');

  let currentVersion = app.getVersion();
  log.info(
    `currentVersion: ${currentVersion} latest.version: ${latest.version}`
  );

  const compareRes = compareVersion(latest.version, currentVersion);
  if (compareRes === 1) {
    log.info('New Version found.');
    if (latest.type === 'full') {
      log.info('new version is full');
      return {
        type: 'full',
        url: '',
      };
    } else {
      log.info('new version is asar');
      const currentIndex = res.data.findIndex(
        (i: UpdateItem) => i.version === currentVersion
      );
      log.info('currentIndex', currentIndex);
      const filterData = res.data.slice(1, currentIndex);
      log.info('filterData', filterData);
      log.info(
        `filterData.some((i) => i.type === 'full')`,
        filterData.some((i: UpdateItem) => i.type === 'full')
      );
      if (filterData.some((i: UpdateItem) => i.type === 'full')) {
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
        progessNum => {
          const integer = Math.floor(progessNum * 100);
          (global.win as BrowserWindow).webContents.send(
            'incremental-download-progress',
            integer
          );
        }
      );
      return {
        type: 'asar',
        url: path.join(targetDir, latest.name),
      };
    }
  } else {
    log.info('update not available.');
    return {
      type: 'null',
      url: '',
    };
  }
}

export function exitAndRunBatch(newAsarPath: string) {
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
    child.on('spawn', () => {
      log.info('child process start successful');
      app.quit();
    });
    child.on('error', err => {
      logErrorInfo('child process on error', err);
    });
    child.unref();

    return true;
  } catch (err) {
    logErrorInfo('bat script run failed error: ', err);
    return false;
  }
}

export function initFullUpdate() {
  const log = global.log;
  (global as any).autoUpdater = autoUpdater;
  autoUpdater.logger = log;
  autoUpdater.autoInstallOnAppQuit = false;
  // autoUpdater.disableDifferentialDownload = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });
  autoUpdater.on('update-available', () => {
    log.info('Update available.');
  });
  autoUpdater.on('update-not-available', () => {
    log.info('Update not available.');
  });
  autoUpdater.on('error', (err: Error) => {
    log.info('Error in auto-updater. ' + err);
  });
  autoUpdater.on('download-progress', (progressObj: any) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message =
      log_message +
      ' (' +
      progressObj.transferred +
      '/' +
      progressObj.total +
      ')';
    log.info(
      `full update progressObj.percent: ${
        progressObj.percent
      } ${typeof progressObj.percent}`
    );
    const integer = Math.floor(progressObj.percent);
    (global.win as BrowserWindow).webContents.send(
      'incremental-download-progress',
      integer
    );
  });
  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded');
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 4000);
  });

  return autoUpdater;
}
