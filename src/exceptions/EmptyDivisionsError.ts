import { BadRequestError } from 'routing-controllers';

export class EmptyDivisionsError extends BadRequestError {
  constructor() {
    super('Divisions should not be empty');
  }
}
