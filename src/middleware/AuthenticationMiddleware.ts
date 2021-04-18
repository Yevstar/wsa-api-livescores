import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import * as jwt from 'jwt-simple';
import { Inject } from 'typedi';
import UserService from '../services/UserService';
import { User } from '../models/User';

@Middleware({ type: 'before' })
export class AuthenticationMiddleware implements ExpressMiddlewareInterface {
  @Inject()
  private userService: UserService;

  public async use(req: any, res: any, next: any) {
    if (req.url.startsWith('/users/') || req.url === 'favicon.ico') {
      return next();
    }
    const authorization: string = req.headers.authorization || '';
    let user: User;
    if (authorization.length > 0) {
      try {
        const data = jwt.decode(authorization, process.env.SECRET).data.split(':');
        //tODO need add REDIS!!!!!
        let loginUser = await this.userService.findByCredentials(data[0], data[1]);
        if (loginUser) {
          user = loginUser;
        }
      } catch (error) {
        res.send(401, { status: 401, message: 'Unauthorized' });
        return;
      }
    }
    req.headers.authorization = user;
    next();
  }
}
