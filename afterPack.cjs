const fsSync = require('fs');
const path = require('path');
const child = require('child_process');
const fs = require('fs-extra');
const afterAllArtifactBuild = require('./afterAllArtifactBuild.cjs');

module.exports = async () => {
  async function deleteDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      return;
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await deleteDirectory(entryPath);
      } else {
        await fs.unlink(entryPath);
      }
    }

    await fs.rmdir(dirPath);
  }

  /**
   * 递归复制目录及其所有内容到目标目录
   * @param {string} source 源目录路径
   * @param {string} destination 目标目录路径
   * @param {object} options 可选配置
   * @param {boolean} options.overwrite 是否覆盖已存在的文件，默认 true
   * @returns {Promise<void>}
   */
  async function copyDirectory(source, destination, options = {}) {
    const { overwrite = true } = options;

    try {
      await fs.access(source);
    } catch (err) {
      throw new Error(`  • source doesn't exist: ${source}`);
    }

    await deleteDirectory(destination);

    await fs.mkdir(destination, { recursive: true });

    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, destPath, options);
      } else {
        try {
          await fs.access(destPath);

          if (!overwrite) {
            continue;
          }

          await fs.unlink(destPath);
        } catch {}

        await fs.copyFile(sourcePath, destPath);
      }
    }
  }

  async function moveToDirectory(source, targetDir) {
    try {
      if (!(await fs.pathExists(source))) {
        throw new Error(`moveToDirectory source doesn't exist: ${source}`);
      }

      const sourceName = path.basename(source);
      const targetPath = path.join(targetDir, sourceName);

      await fs.ensureDir(targetDir);

      if (await fs.pathExists(targetPath)) {
        await fs.remove(targetPath);
        console.log(
          `  • moveToDirectory already remove same source in targetDir: ${targetPath}`
        );
      }

      await fs.copy(source, targetPath);
      console.log(`  • moveToDirectory move successful: ${targetPath}`);
    } catch (error) {
      console.error('  • moveToDirectory move failed:', error.message);
      throw error;
    }
  }

  async function getExeFilePaths(targetDir) {
    try {
      const files = await fs.readdir(targetDir);

      const exePaths = files
        .filter(file => path.extname(file) === '.exe')
        .map(file => path.join(targetDir, file));

      return exePaths;
    } catch (err) {
      console.error('get .exe file failed：', err.message);
      return [];
    }
  }

  function compareVersion(v1, v2) {
    let i;
    let len;

    if (typeof v1 + typeof v2 !== 'stringstring') {
      return false;
    }

    let a = v1.split('.');
    let b = v2.split('.');
    i = 0;
    len = Math.max(a.length, b.length);

    for (; i < len; i++) {
      if (
        (a[i] && !b[i] && parseInt(a[i]) > 0) ||
        parseInt(a[i]) > parseInt(b[i])
      ) {
        return 1;
      } else if (
        (b[i] && !a[i] && parseInt(b[i]) > 0) ||
        parseInt(a[i]) < parseInt(b[i])
      ) {
        return -1;
      }
    }

    return 0;
  }

  function extractVersionFromFilename(filename) {
    const versionMatch = filename.match(/v(\d+\.\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : null;
  }

  function sortFilesByVersion(filePaths, ascending = true) {
    return [...filePaths].sort((pathA, pathB) => {
      const filenameA = pathA.split(/[\\/]/).pop();
      const filenameB = pathB.split(/[\\/]/).pop();

      const versionA = extractVersionFromFilename(filenameA);
      const versionB = extractVersionFromFilename(filenameB);

      if (!versionA && !versionB) return 0;
      if (!versionA) return 1;
      if (!versionB) return -1;

      const compareResult = compareVersion(versionA, versionB);
      return ascending ? compareResult : -compareResult;
    });
  }

  const source = path.join(__dirname, './out/win-unpacked');
  const dest = path.join(__dirname, './nsis_publish/FilesToInstall');
  await copyDirectory(source, dest);
  console.log(`  • copy win-unpacked dir successful: ${source} -> ${dest}`);

  const out = fsSync.openSync(path.join(__dirname, './out.log'), 'a');
  const err = fsSync.openSync(path.join(__dirname, './out.log'), 'a');
  const batPath = path.join(__dirname, './nsis_publish/build-nim-nozip.bat');

  const batDir = path.dirname(batPath);

  const ch = child.spawn(batPath, [], {
    detached: true,
    shell: true,
    stdio: ['ignore', out, err],
    cwd: batDir,
  });

  ch.on('exit', async code => {
    console.log(`  • child process exit，code: ${code}`);

    const dest = path.join(__dirname, './out');
    const targetDir = path.join(__dirname, './nsis_publish/Output/');
    const exefiles = await getExeFilePaths(targetDir);
    const sortfiles = sortFilesByVersion(exefiles, false);

    try {
      await moveToDirectory(sortfiles[0], dest);

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
