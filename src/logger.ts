import winston from "winston";
import WinstonCloudWatch  from "winston-cloudwatch";

var NODE_ENV = process.env.NODE_ENV || 'local';

const logger = winston.createLogger ({
  format: winston.format.json(),
  transports: [],
  exitOnError: false
});


let config = {
  level: process.env.LOG_LEVEL,
  logGroupName: process.env.CLOUDWATCH_GROUP_NAME,
  logStreamName: process.env.CLOUDWATCH_STREAM_NAME,
  awsAccessKeyId: process.env.CLOUDWATCH_ACCESS_KEY_ID,
  awsSecretKey: process.env.CLOUDWATCH_SECRET_ACCESS_KEY,
  awsRegion:  process.env.CLOUDWATCH_REGION,
  jsonMessage: true,
  messageFormatter: function(item) {
    return item.level + ': ' + item.msg + ' ' + JSON.stringify(item.meta)
  }
}

if (NODE_ENV != 'local') {
  logger.add(new WinstonCloudWatch(config));
}
else{
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

function wrapConsole() {
    console.log = (message?: any, ...optionalParams: any[]): void => {
        logger.info(message, ...optionalParams);
    };
    console.error = (message?: any, ...optionalParams: any[]): void => {
        // Temporary ditching this annoying error.
        if (message !== 'Ignoring invalid configuration option passed to Connection: acquireTimeout. ' +
            'This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass ' +
            'an invalid configuration options to a Connection') {
            logger.error(message, ...optionalParams);
        }
    };
    console.warn = (message?: any, ...optionalParams: any[]): void => {
        logger.warn(message, ...optionalParams);
    };
}

export {
    logger,
    wrapConsole
};
