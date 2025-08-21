const { statSync, writeFileSync } = require('node:fs');
const path = require('path');
const { hashFile } = require('./utils.cjs');

module.exports = async () => {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageInfo = require(packageJsonPath);
  const appName = packageInfo.name;
  const version = packageInfo.version;
  const installerName = `${appName}_V${version}.exe`;

  const installerPath = path.join(__dirname, `../out/${installerName}`);

  const hash = await hashFile(installerPath, undefined, undefined, {
    highWaterMark: 1024 * 1024 * 10,
  });

  const fileStats = statSync(installerPath);
  const fileSize = fileStats.size;

  const releaseDate = new Date().toISOString();

  const yamlContent = [
    `version: ${version}`,
    `files:`,
    `  - url: ${installerName}`,
    `    sha512: ${hash}`,
    `    size: ${fileSize}`,
    `path: ${installerName}`,
    `sha512: ${hash}`,
    `releaseDate: '${releaseDate}'`,
  ].join('\n');

  const ymlFilePath = path.join(__dirname, '../out/latest.yml');
  writeFileSync(ymlFilePath, yamlContent, 'utf8');

  console.log(`  • Successfully generated ${ymlFilePath}`);
  console.log(`  • Version: ${version}`);
  console.log(`  • Installer: ${installerName}`);
  console.log(`  • File size: ${fileSize} bytes`);
};
