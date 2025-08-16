const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const child = require('child_process');

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
        // console.log(`  • 已删除文件: ${entryPath}`);
      }
    }

    await fs.rmdir(dirPath);
    // console.log(`  • 已删除目录: ${dirPath}`);
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
      throw new Error(`  • 源目录不存在: ${source}`);
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
            // console.log(`  • 文件已存在，跳过: ${destPath}`);
            continue;
          }

          await fs.unlink(destPath);
        } catch {}

        await fs.copyFile(sourcePath, destPath);
        // console.log(`  • 已复制: ${sourcePath} -> ${destPath}`);
      }
    }

    // console.log(`  • 目录复制完成: ${source} -> ${destination}`);
  }

  const source = path.join(__dirname, './out/win-unpacked');
  const dest = path.join(__dirname, './nsis_publish/FilesToInstall');
  await copyDirectory(source, dest);
  console.log(`  • 目录复制完成: ${source} -> ${dest}`);

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

  ch.on('exit', code => {
    console.log(`  • 子进程退出，代码: ${code}`);
  });

  ch.on('error', err => {
    console.error('  • 子进程启动失败:', err);
  });
};
