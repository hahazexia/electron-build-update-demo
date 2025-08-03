const localPgk = require('local-pkg');
const asar = require('@electron/asar');
const path = require('path');
const fs = require('fs-extra');

module.exports = async (context) => {
  async function moveToDirectory(source, targetDir) {
    try {
      if (!(await fs.pathExists(source))) {
        throw new Error(`moveToDirectory source doesn't exist: ${source}`);
      }

      const sourceName = path.basename(source);
      const targetPath = path.join(targetDir, sourceName);

      // ensure targetDir exists,if doesn't then creat
      await fs.ensureDir(targetDir);

      // check targetDir exists same source, if exists remove
      if (await fs.pathExists(targetPath)) {
        await fs.remove(targetPath);
        console.log(
          `  • moveToDirectory already remove same source in targetDir: ${targetPath}`
        );
      }

      await fs.move(source, targetPath);
      console.log(`  • moveToDirectory move successful: ${targetPath}`);
    } catch (error) {
      console.error('  • moveToDirectory move failed:', error.message);
      throw error;
    }
  }

  async function extractAsarFile(from, dest) {
    try {
      await fs.ensureDir(dest);

      console.log(`  • start extract asar: ${from}`);
      console.log(`  • extract to dest: ${dest}`);

      await asar.extractAll(from, dest);

      console.log('  • asar extract complete');
      return true;
    } catch (error) {
      console.error('  • asar extract error:', error);
      throw error;
    }
  }

  const pkg = localPgk.loadPackageJSONSync();

  const from = path.join(__dirname, './dist/win-unpacked/resources/app.asar');
  const dest = path.join(__dirname, './dist/win-unpacked/resources/temp');
  const target = path.join(
    __dirname,
    `./dist/win-unpacked/resources/${pkg.name}-${pkg.version}.asarfolder/`
  );

  try {
    // extract app.asar to temp folder
    await extractAsarFile(from, dest);
    console.log('  • extract app.asar complete');

    const nodeModulesPath = path.join(
      __dirname,
      './dist/win-unpacked/resources/temp/node_modules'
    );
    const pkgPath = path.join(
      __dirname,
      './dist/win-unpacked/resources/temp/package.json'
    );

    // copy mode_modules and package.json to main asar folder
    await moveToDirectory(nodeModulesPath, target);
    await moveToDirectory(pkgPath, target);

    // remove temp
    await fs.remove(dest);
    console.log('  • remove temp file complete');

    const asarFolder = path.join(
      __dirname,
      `./dist/win-unpacked/resources/${pkg.name}-${pkg.version}.asarfolder`
    );
    const asarDest = path.join(
      __dirname,
      `./dist/win-unpacked/resources/${pkg.name}-${pkg.version}.asar`
    );

    // pack asar folder
    await asar.createPackage(asarFolder, asarDest);

    console.log('  • asar pack complete');

    // remove original asar folder
    await fs.remove(asarFolder);

    console.log('  • remove asar temp folder complete');
  } catch (err) {
    throw err;
  }
};
