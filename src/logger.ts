import bunyan from "bunyan";
import {LoggingBunyan} from "@google-cloud/logging-bunyan";

const logger = bunyan.createLogger({
    name: process.env.LOG_NAME || 'log',
    level: process.env.LOG_LEVEL as bunyan.LogLevel,
    src: true,
    streams: streams()
});

function streams(): bunyan.Stream[] {
    if (process.env.NODE_ENV === "production") {
        const loggingBunyan = new LoggingBunyan({
            logName: process.env.LOG_NAME
        });
        return [loggingBunyan.stream("debug")];
    }
    return [{stream: process.stdout}];
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
