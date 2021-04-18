import { Get, JsonController, QueryParam, Param } from 'routing-controllers';
import { LinkedCompetitionOrganisation } from '../models/LinkedCompetitionOrganisation';
import { BaseController } from './BaseController';

@JsonController('/linkedCompetitionOrganisation')
export class LinkedCompetitionOrganisationController extends BaseController {
  @Get('/id/:id')
  async get(@Param('id') id: number) {
    return this.linkedCompetitionOrganisationService.findById(id);
  }

  @Get('/')
  async find(
    @QueryParam('name') name: string,
    @QueryParam('competitionId') competitionId: number,
  ): Promise<LinkedCompetitionOrganisation[]> {
    return this.linkedCompetitionOrganisationService.findByNameAndCompetitionId(
      name,
      competitionId,
    );
  }
}
