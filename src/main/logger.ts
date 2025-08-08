import { app } from 'electron';
import path from 'node:path';
import { format } from 'date-fns';
import fs from 'node:fs';
import log from 'electron-log';

let isInitialized = false;
let fileLimit = 5;

function initLogger(): any {
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
  const archiveLog = (filePath: any) => {
    try {
      const filePathStr = filePath.toString();
      if (!fs.existsSync(filePathStr)) {
        console.warn(`log file doesn't exists, skip the rotate: ${filePath}`);
        return;
      }

      const info = path.parse(filePathStr);
      const baseName = info.name;
      const ext = info.ext;
      const dir = info.dir;

      const allFiles = fs
        .readdirSync(dir)
        .filter(file => {
          return file.startsWith(baseName) && file.endsWith(ext);
        })
        .map(file => path.join(dir, file));

      const getFileIndex = (file: string) => {
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

export default initLogger();
