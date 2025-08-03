const log = require('electron-log');
const { app } = require('electron');
const path = require('path');
const { format } = require('date-fns');

let isInitialized = false;

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
  log.transports.file.resolvePathFn = () => logPath;
  log.transports.file.maxSize = 10 * 10 * 1024;

  log.transports.file.format =
    '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

  isInitialized = true;
  return log;
}

module.exports = initLogger();
