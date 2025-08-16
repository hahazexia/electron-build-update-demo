const { createHash } = require('node:crypto');
const { createReadStream, statSync, writeFileSync } = require('node:fs');
const path = require('path');

module.exports = async () => {
  function hashFile(
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
  }

  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageInfo = require(packageJsonPath);
  const appName = packageInfo.name;
  const version = packageInfo.version;
  const installerName = `${appName}_v${version}.0.exe`;

  const installerPath = path.join(__dirname, `./out/${installerName}`);

  const hash = await hashFile(installerPath, undefined, undefined, {
    highWaterMark: 1024 * 1024 * 10,
  });

  const fileStats = statSync(installerPath);
  const fileSize = fileStats.size;

  const releaseDate = new Date().toISOString();

  const yamlContent = `version: ${version}
files:
  - url: ${installerName}
    sha512: ${hash}
    size: ${fileSize}
path: ${installerName}
sha512: ${hash}
releaseDate: '${releaseDate}'`;

  const ymlFilePath = path.join(__dirname, './out/latest1.yml');
  writeFileSync(ymlFilePath, yamlContent, 'utf8');

  console.log(`Successfully generated ${ymlFilePath}`);
  console.log(`Version: ${version}`);
  console.log(`Installer: ${installerName}`);
  console.log(`File size: ${fileSize} bytes`);
};
