export function logErrorInfo(msg, error) {
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
