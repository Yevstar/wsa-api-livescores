import {HttpError} from "routing-controllers";

export class PermissionError extends HttpError {

    constructor() {
        super(403, `Not have permission`);
        super.name = 'RequestError';
    }
}
