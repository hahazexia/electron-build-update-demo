const fsSync = require('fs');
const path = require('path');
const child = require('child_process');
const fs = require('fs-extra');
const afterAllArtifactBuild = require('./afterAllArtifactBuild.cjs');
const {
  copyDirectory,
  moveToDirectory,
  getExeFilePaths,
  sortFilesByVersion,
} = require('./utils.cjs');

module.exports = async () => {
  const source = path.join(__dirname, '../out/win-unpacked');
  const dest = path.join(__dirname, '../nsis_publish/FilesToInstall');
  await copyDirectory(source, dest);
  console.log(`  • copy win-unpacked dir successful: ${source} -> ${dest}`);

  const out = fsSync.openSync(path.join(__dirname, '../out.log'), 'a');
  const err = fsSync.openSync(path.join(__dirname, '../out.log'), 'a');
  const batPath = path.join(__dirname, '../nsis_publish/build-nim.bat');

  const batDir = path.dirname(batPath);

  const ch = child.spawn(batPath, [], {
    detached: true,
    shell: true,
    stdio: ['ignore', out, err],
    cwd: batDir,
  });

  ch.on('exit', async code => {
    console.log(`  • child process exit，code: ${code}`);

    const dest = path.join(__dirname, '../out');
    const targetDir = path.join(__dirname, '../nsis_publish/Output/');
    const exefiles = await getExeFilePaths(targetDir);
    const sortfiles = sortFilesByVersion(exefiles, false);

    try {
      await moveToDirectory(sortfiles[0], dest);
      (async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
      })();

      console.log('  • move final installer file successful');
      afterAllArtifactBuild();
    } catch (err) {
      console.log(`  • move final installer file error: ${err.message}`);
      throw err;
    }
  });

  ch.on('error', err => {
    console.error('  • child process failed:', err);
  });
};
