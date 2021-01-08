import {Authorized, BodyParam, Get, JsonController, Param, Patch, QueryParam} from "routing-controllers";
import {BaseController} from "./BaseController";
import {UmpireCompetitionRank} from "../models/UmpireCompetitionRank";
import {CrudResponse} from "./dto/CrudResponse";
import {User} from "../models/User";

@JsonController('/competitions/:competitionId/umpires')
@Authorized()
export class UmpireController extends BaseController {

    @Get()
    index(
        @Param('competitionId') competitionId: number,
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
    ): Promise<CrudResponse<User>> {
        return this.umpireService.findManyByCompetitionId(competitionId);
    }

    @Patch('/:umpireId/rank')
    updateRank(
        @Param('competitionId') competitionId: number,
        @Param('umpireId') umpireId: number,
        @BodyParam('rank', {required: true}) rank: number,
    ): Promise<UmpireCompetitionRank> {
        return this.umpireService.updateRank(competitionId, umpireId, rank)
    }
}