const path = require('node:path');
const fs = require('node:fs');
const { app } = require('electron');

exports.getMajorPackageInfo = function getMajorPackageInfo(mainAsarPath) {
  try {
    const log = global.log;
    let pkgPath;

    if (!app.isPackaged) {
      pkgPath = path.join(__dirname, './package.json');
    } else {
      pkgPath = path.join(mainAsarPath, 'package.json');
    }

    const pkgContent = fs.readFileSync(pkgPath, 'utf8');
    return JSON.parse(pkgContent);
  } catch (error) {
    log.error('read package.json failed:', error);
    return {
      name: 'unknown-app',
      version: '0.0.0',
    };
  }
};

exports.findAsarFilesInResources = function findAsarFilesInResources() {
  try {
    const log = global.log;
    const resourcesPath = path.dirname(app.getAppPath());
    log.log('resources dir path:', resourcesPath);

    const files = fs.readdirSync(resourcesPath, { withFileTypes: true });

    const asarFiles = files
      .filter(
        (item) =>
          !item.isDirectory() &&
          item.name.includes('asar') &&
          item.name !== 'app.asar'
      )
      .map((item) => path.join(resourcesPath, item.name));

    log.log(`find ${asarFiles.length} files includes asar:`);
    asarFiles.forEach((file) => log.log(`- ${file}`));

    return asarFiles;
  } catch (error) {
    log.error('get asar files list failed:', error.message);
    return [];
  }
};
