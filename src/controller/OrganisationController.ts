import {Get, JsonController, QueryParam, Param} from 'routing-controllers';
import {Organisation} from '../models/Organisation';
import {BaseController} from "./BaseController";

@JsonController('/organisation')
export class OrganisationController extends BaseController {

    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.organisationService.findById(id);
    }

    @Get('/')
    async find(
        @QueryParam('name') name: string,
        @QueryParam('competitionId') competitionId: number
    ): Promise<Organisation[]> {
        return this.organisationService.findByNameAndCompetitionId(name, competitionId);
    }
}
