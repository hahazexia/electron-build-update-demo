const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const fs = require('fs-extra');
const path = require('path');

exports.hashFile = function hashFile(
  file,
  algorithm = 'sha512',
  encoding = 'base64',
  options = {}
) {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    hash.on('error', reject).setEncoding(encoding);

    createReadStream(file, {
      ...options,
      highWaterMark: 1024 * 1024,
    })
      .on('error', reject)
      .on('end', () => {
        hash.end();
        resolve(hash.read());
      })
      .pipe(hash, { end: false });
  });
};

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
exports.copyDirectory = async function copyDirectory(
  source,
  destination,
  options = {}
) {
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
};

exports.moveToDirectory = async function moveToDirectory(source, targetDir) {
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
};

exports.getExeFilePaths = async function getExeFilePaths(targetDir) {
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
};

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

exports.sortFilesByVersion = function sortFilesByVersion(
  filePaths,
  ascending = true
) {
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
};
