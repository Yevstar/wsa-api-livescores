import {Get, JsonController, QueryParam} from 'routing-controllers';
import {Club} from '../models/Club';
import {BaseController} from "./BaseController";

@JsonController('/clubs')
export class ClubController extends BaseController {

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
