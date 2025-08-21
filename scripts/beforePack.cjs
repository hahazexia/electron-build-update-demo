const fs = require('fs');
const path = require('path');

function updateNsiVersion(nsiFilePath, newVersion, pkgVersion) {
  try {
    const fileContentBuffer = fs.readFileSync(nsiFilePath);
    let fileContent = fileContentBuffer.toString('utf16le');
    const versionRegex = /(!define PRODUCT_VERSION\s+)"[^"]+"/;
    const productVersionRegex = /(!define PRODUCT_SHOW_VERSION\s+)"[^"]+"/;
    const updatedContent = fileContent
      .replace(versionRegex, `$1"${newVersion}"`)
      .replace(productVersionRegex, `$1"${pkgVersion}"`);
    const contentBuffer = Buffer.from(updatedContent, 'utf16le');
    fs.writeFileSync(nsiFilePath, contentBuffer);
    console.log(
      `  • nsi version updated successfully! New version: ${newVersion}`
    );
  } catch (error) {
    console.error(`Failed to update version: ${error.message}`);
    process.exit(1);
  }
}

const packageJsonPath = path.join(__dirname, '../package.json');
const packageInfo = require(packageJsonPath);
const appName = packageInfo.name;
const version = packageInfo.version;

const nsiFile = path.resolve(
  __dirname,
  '../nsis_publish/SetupScripts/nim/nim_setup.nsi'
);
const targetVersion = `${version}.0`;
console.log(`  • targetVersion ${targetVersion}`);

updateNsiVersion(nsiFile, targetVersion, version);
