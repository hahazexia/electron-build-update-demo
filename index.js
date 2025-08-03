const path = require('node:path');
const { app, dialog } = require('electron');
const log = require('./logger');
const fs = require('node:fs');
const { getMajorPackageInfo, findAsarFilesInResources } = require('./utils.js');

try {
  if (app.isPackaged) {
    const asarFiles = findAsarFilesInResources();
    log.info(asarFiles, 'asarFiles');
    if (asarFiles.length > 1) {
      const tmp = asarFiles.filter((i) => i.includes('.tmp'))[0];
      const old = asarFiles.filter((i) => !i.includes('.tmp'))[0];
      log.info(`tmp: ${tmp} old: ${old}`);
      if (tmp && old) {
        try {
          fs.renameSync(tmp, tmp.replace('.tmp', ''));
          fs.unlinkSync(old);
          log.info('update main asar successful');
        } catch (err) {
          log.error(`fs.renameSync err: ${err}`);
        }
      }
    }
  }

  let mainAppPath;
  // dev enviroment directly load main.js
  if (!app.isPackaged) {
    mainAppPath = path.join(app.getAppPath(), 'main', 'main.js');
  } else {
    // prod enviroment load main.js in main.asar
    const asarFiles = findAsarFilesInResources();
    const mainAsar = asarFiles[0];
    const pkg = getMajorPackageInfo(mainAsar);
    log.info(pkg, 'pkg');
    const resourcesPath = path.dirname(app.getAppPath());
    mainAppPath = path.join(
      resourcesPath,
      `${pkg.name}-${pkg.version}.asar`,
      'main.js'
    );
  }

  log.info('Loading main application from:', mainAppPath);
  const mainModule = require(mainAppPath);
  mainModule(log);
} catch (error) {
  log.error('Failed to load main application:', error);

  dialog.showErrorBox(
    '应用加载失败',
    `无法加载主应用模块: ${error.message}\n请尝试重新安装应用`
  );

  app.quit();
}
