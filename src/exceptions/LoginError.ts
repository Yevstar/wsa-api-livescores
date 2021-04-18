import { HttpError } from 'routing-controllers';

export class LoginError extends HttpError {
  constructor() {
    super(404, `Invalid username or password.`);
    super.name = 'LoginError';
  }
}
