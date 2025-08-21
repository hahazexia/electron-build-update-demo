import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const installerPath = path.join(
  __dirname,
  './out/electron-update Setup 1.0.0.exe'
);

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
      highWaterMark:
        1024 * 1024 /* better to use more memory but hash faster */,
    })
      .on('error', reject)
      .on('end', () => {
        hash.end();
        resolve(hash.read());
      })
      .pipe(hash, { end: false });
  });
}

const hash = await hashFile(installerPath, undefined, undefined, {
  highWaterMark: 1024 * 1024 * 10,
});

console.log(hash, 'hash');
