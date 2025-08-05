const log = require('electron-log');
const { app } = require('electron');
const path = require('path');
const { format } = require('date-fns');
const fs = require('fs-extra');

let isInitialized = false;
let fileLimit = 5;

function initLogger() {
  if (isInitialized) {
    return log;
  }

  log.transports.file.level = 'info';
  log.transports.console.level = 'silly';

  const logPath = path.join(
    app.getPath('userData'),
    'logs',
    `app-${format(new Date(), 'yyyy-MM-dd')}.log`
  );
  const archiveLog = filePath => {
    try {
      filePath = filePath.toString();
      if (!fs.existsSync(filePath)) {
        console.warn(`log file doesn't exists, skip the rotate: ${filePath}`);
        return;
      }

      const info = path.parse(filePath);
      const baseName = info.name;
      const ext = info.ext;
      const dir = info.dir;

      const allFiles = fs
        .readdirSync(dir)
        .filter(file => {
          return file.startsWith(baseName) && file.endsWith(ext);
        })
        .map(file => path.join(dir, file));

      const getFileIndex = file => {
        const name = path.parse(file).name;
        const match = name.match(/\.(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      };

      allFiles.sort((a, b) => getFileIndex(a) - getFileIndex(b));

      for (let i = allFiles.length - 1; i >= 0; i--) {
        const currentFile = allFiles[i];
        const currentIndex = getFileIndex(currentFile);
        const newIndex = currentIndex + 1;

        if (newIndex > fileLimit) {
          fs.unlinkSync(currentFile);
          continue;
        }

        const newFileName = `${baseName}.${newIndex}${ext}`;
        const newFilePath = path.join(dir, newFileName);

        if (fs.existsSync(newFilePath)) {
          fs.unlinkSync(newFilePath);
        }
        fs.renameSync(currentFile, newFilePath);
      }
    } catch (e) {
      console.error('log rotate failed:', e);
    }
  };
  log.transports.file.archiveLogFn = archiveLog;
  log.transports.file.resolvePathFn = () => logPath;
  log.transports.file.maxSize = 1024 * 1024 * 10;

  log.transports.file.format =
    '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

  isInitialized = true;
  return log;
}

module.exports = initLogger();
