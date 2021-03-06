var fs = require('fs');
var path = require('path');
var winston = require('winston');
var moment = require('moment');
var stackTrace = require('stack-trace');
var _ = require('lodash');
var RotateFile = require('winston-daily-rotate-file');
var env = process.env.NODE_ENV;
var logDir = path.resolve('.','log');
var logger;
var dateFormat = function () {
  return moment().format('YYYY-MM-DD HH:mm:ss:SSS');
}
logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      timestamp: dateFormat,
      colorize: true
    })
  ]
});
logger.dbLogger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      timestamp: dateFormat,
      colorize: true
    })
  ]
});

if (env === 'product') {
  // 创建log目录
  createLogDir(logDir);
  // 总日志
  var allTransport = new RotateFile({
    name: 'all',
    filename: path.resolve(logDir,'all.log'),
    timestamp: dateFormat,
    level: 'info',
    colorize: true,
    maxsize: 1024*1024*100,
    datePattern: '.yyyy-MM-dd'
  });
  // 错误日志
  var errorTransport = new (winston.transports.File)({
    name: 'error',
    filename: path.resolve(logDir,'error.log'),
    timestamp: dateFormat,
    level: 'error',
    colorize: true
  });
  logger = new (winston.Logger)({
    transports: [
      allTransport,
      errorTransport
    ]
  });

  //崩溃日志
  new (winston.Logger)({
    transports: [
      new (winston.transports.File)({
        name: 'error',
        filename: path.resolve(logDir,'crash.log'),
        level: 'error',
        handleExceptions: true,
        timestamp: dateFormat,
        humanReadableUnhandledException: true,
        json: true,
        colorize: true
      })
    ]
  });

  //数据库日志
  var dbTransport = new (winston.transports.File)({
    name: 'db',
    filename: path.resolve(logDir,'db.log'),
    timestamp: dateFormat,
    level: 'info',
    colorize: true
  });

  var dbErrorTransport = new (winston.transports.File)({
    name: 'db.error',
    filename: path.resolve(logDir,'db.error.log'),
    timestamp: dateFormat,
    level: 'error',
    colorize: true
  });

  logger.dbLogger = new (winston.Logger)({
    transports: [
      dbTransport,
      dbErrorTransport
    ]
  });
  logger.dbLogger.add(allTransport,{},true);
  logger.dbLogger.add(errorTransport,{},true);
}

var originLoggerMethod = logger.error;
logger.error = function () {
  var cellSite = stackTrace.get()[1];
  originLoggerMethod.apply(logger,[
    arguments[0]+'\n',
    {
      filePath:cellSite.getFileName(),
      lineNumber:cellSite.getLineNumber()
    }
  ]);
}

function createLogDir (dirPath) {
  fs.stat(dirPath, function (err,stat) {
    if (err && err.code === 'ENOENT'){
      fs.mkdir(dirPath);
    } else {
      if (!stat.isDirectory()){
        fs.mkdir(dirPath);
      }
    }
  });
}

module.exports = logger;
