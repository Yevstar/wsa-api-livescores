import { Service } from 'typedi';
import { Request } from 'express';

@Service()
export default class HelperService {
  public getAuthTokenFromRequest(request: Request): string {
    const rawHeaders = request.rawHeaders;
    const authorizationIndex = rawHeaders.indexOf('Authorization');

    return rawHeaders[authorizationIndex + 1];
  }
}
