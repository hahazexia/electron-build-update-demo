const localPgk = require('local-pkg');
const asar = require('@electron/asar');
const path = require('path');
const fs = require('fs-extra');


module.exports = async (context) => {
    async function moveToDirectory(source, targetDir) {
        try {
            if (!await fs.pathExists(source)) {
                throw new Error(`源路径不存在: ${source}`);
            }

            const sourceName = path.basename(source);
            const targetPath = path.join(targetDir, sourceName);

            await fs.ensureDir(targetDir);

            if (await fs.pathExists(targetPath)) {
                await fs.remove(targetPath);
                console.log(`已删除已存在的目标路径: ${targetPath}`);
            }

            await fs.move(source, targetPath);
            console.log(`成功移动到: ${targetPath}`);
        } catch (error) {
            console.error('移动操作失败:', error.message);
            throw error;
        }
    }

    async function extractAsarFile(from, dest) {
        try {
            await fs.ensureDir(dest);

            console.log(`开始解压 asar 文件: ${from}`);
            console.log(`解压到目标目录: ${dest}`);

            await asar.extractAll(from, dest);

            console.log('asar 文件解压完成');
            return true;
        } catch (error) {
            console.error('解压 asar 文件时出错:', error);
            throw error;
        }
    }

    const pkg = localPgk.loadPackageJSONSync();

    const from = path.join(__dirname, './dist/win-unpacked/resources/app.asar');
    const dest = path.join(__dirname, './dist/win-unpacked/resources/temp');
    const target = path.join(__dirname, `./dist/win-unpacked/resources/${pkg.name}-${pkg.version}.asarfolder/`);


    try {
        await extractAsarFile(from, dest);
        console.log('解压 asar 完成');

        const nodeModulesPath = path.join(__dirname, './dist/win-unpacked/resources/temp/node_modules');
        const pkgPath = path.join(__dirname, './dist/win-unpacked/resources/temp/package.json');

        await moveToDirectory(nodeModulesPath, target);
        await moveToDirectory(pkgPath, target);

        await fs.remove(dest);
        console.log('删除临时文件完成');

        const asarFolder = path.join(__dirname, `./dist/win-unpacked/resources/${pkg.name}-${pkg.version}.asarfolder`);
        const asarDest = path.join(__dirname, `./dist/win-unpacked/resources/${pkg.name}-${pkg.version}.asar`)
        await asar.createPackage(asarFolder, asarDest);

        console.log('压缩 asar 文件成功');

        await fs.remove(asarFolder);

        console.log('删除asar临时文件夹完成');
    } catch (err) {
        throw err;
    }
}