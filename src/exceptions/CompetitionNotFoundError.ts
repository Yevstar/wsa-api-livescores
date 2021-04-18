import { HttpError } from 'routing-controllers';

export class CompetitionNotFoundError extends HttpError {
  constructor() {
    super(404, `Competition not found.`);
    super.name = 'Not Found';
  }
}
