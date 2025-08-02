const path = require('node:path');
const { app, dialog } = require('electron');
const log = require('./logger');
const fs = require('node:fs');

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
        } catch (err) {
          log.error(`fs.renameSync err: ${err}`);
        }
        log.info('更新主应用 asar 成功');
      }
    }
  }

  let mainAppPath;
  // 本地开发环境直接加载main.js
  if (!app.isPackaged) {
    mainAppPath = path.join(app.getAppPath(), 'main', 'main.js');
  } else {
    // 用户安装后的生产环境加载主应用 asar 中的 main.js
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
