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

export function compareVersion(a: string, b: string) {
  var i;
  var len;

  if (typeof a + typeof b !== 'stringstring') {
    return false;
  }

  a = a.split('.');
  b = b.split('.');
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
