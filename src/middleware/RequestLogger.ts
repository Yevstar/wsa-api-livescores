import {ExpressMiddlewareInterface, Middleware} from 'routing-controllers';
import {NextFunction, Request, Response} from 'express';
import {logger} from "../logger";

@Middleware({
    type: 'after',
    priority: 10
})
export class RequestLogger implements ExpressMiddlewareInterface {

    use(req: Request, res: Response, next: NextFunction) {
        logger.debug('RequestLogger:'+ `{"method":"${req.method}", "path":"${req.path}", "headers":${JSON.stringify(req.headers)},
        "params":${JSON.stringify(req.query)}, "body":${JSON.stringify(req.body ? req.body : null)}}`);
        next();
    }
}
