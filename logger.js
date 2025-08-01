const log = require('electron-log');
const { app } = require('electron');
const path = require('path');

// 标记是否已初始化
let isInitialized = false;

function initLogger() {
    if (isInitialized) {
        // 已初始化则直接返回实例，避免重复配置
        return log;
    }

    // 配置日志（只执行一次）
    log.transports.file.level = 'info'; // 文件日志级别
    log.transports.console.level = 'silly'; // 控制台日志级别

    // 自定义日志文件路径
    const logPath = path.join(app.getPath('userData'), 'logs', 'app.log');
    log.transports.file.resolvePath = () => logPath;

    // 可选：配置日志格式
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

    isInitialized = true;
    return log;
}

// 导出已初始化的日志实例
module.exports = initLogger();