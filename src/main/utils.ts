import fs from 'node:fs/promises';
import path from 'node:path';

export function logErrorInfo(msg: string, error: any) {
  const log = global.log;
  log.error({
    errorSummary: msg,
    message: error.message,
    code: error.code,
    signal: error.signal,
    cmd: error.cmd,
    stack: error.stack,
  });
}

export function compareVersion(v1: string, v2: string) {
  var i;
  var len;

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

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  if (await pathExists(dirPath)) {
    return;
  }

  const parentDir = path.dirname(dirPath);
  // 防止根目录递归（处理类似 "/" 或 "C:\\" 这样的路径）
  if (parentDir !== dirPath) {
    await ensureDir(parentDir);
  }

  try {
    await fs.mkdir(dirPath, { recursive: false });
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code !== 'EEXIST') {
      throw err;
    }
  }
}
