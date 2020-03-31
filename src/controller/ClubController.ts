import {Get, JsonController, QueryParam, Param} from 'routing-controllers';
import {Club} from '../models/Club';
import {BaseController} from "./BaseController";

@JsonController('/clubs')
export class ClubController extends BaseController {

    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.clubService.findById(id);
    }

    @Get('/')
    async find(
        @QueryParam('name') name: string,
        @QueryParam('competitionId') competitionId: number = undefined
    ): Promise<Club[]> {
        if (competitionId) {
            return this.clubService.findByNameAndCompetitionId(name, competitionId);
        } else {
            return this.clubService.findByName(name);
        }
    }

}
