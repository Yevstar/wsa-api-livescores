import * as express from 'express';
import {ExpressErrorMiddlewareInterface, HttpError, Middleware} from 'routing-controllers';


@Middleware({type: 'after'})
export class ErrorHandlerMiddleware implements ExpressErrorMiddlewareInterface {

    error(error: HttpError, req: express.Request, res: express.Response, next: express.NextFunction): void {
        if (!res.headersSent) {
            if (error.httpCode != 500) {
                res.status(error.httpCode ? error.httpCode : 500);
                let name: string;
                let message: string;
                switch (error.name) {
                    case 'NotFoundError':
                        name = 'empty_response';
                        message = 'Object not found';
                        break;
                    case 'InvalidCharacterError':
                    case 'LoginError':
                        name = 'failed_login';
                        message = error.message;
                        break;
                    case 'AuthorizationRequiredError':
                        name = 'unauthorized_access';
                        message = 'Before using api client must be authorized';
                        break;
                    default:
                        name = error.name;
                        message = error.message;

                }
                res.json({
                    name: name,
                    message: message
                });
            } else {
                res.status(error.httpCode);
                res.json({
                    name: error.name,
                    message: error.message,
                });
            }
        }
        //logger.error(error.name, error.stack);
    }
}