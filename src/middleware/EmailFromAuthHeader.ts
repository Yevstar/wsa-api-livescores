import {createParamDecorator} from "routing-controllers";
import * as jwt from 'jwt-simple';

export function EmailFromAuthHeader() {

    return createParamDecorator({

        value: async (action) => {
            if (action.request.headers.authorization.length > 1) {
                try {
                    const data = jwt.decode(action.request.headers.authorization, process.env.SECRET).data.split(':');
                    return data[0]
                } catch (e) {
                    return null;
                }
            }
        }
    });
}
