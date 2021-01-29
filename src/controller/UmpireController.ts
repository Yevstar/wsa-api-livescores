import {Authorized, BodyParam, Get, JsonController, Param, Patch, QueryParam} from "routing-controllers";
import {BaseController} from "./BaseController";
import {UmpireCompetitionRank} from "../models/UmpireCompetitionRank";
import {CrudResponse} from "./dto/CrudResponse";
import {User} from "../models/User";
import {RequiredQueryParam} from "../decorators/RequiredQueryParamDecorator";

@JsonController('/competitions/:competitionId/umpires')
@Authorized()
export class UmpireController extends BaseController {

    @Get()
    index(
        @Param('competitionId') competitionId: number,
        @RequiredQueryParam('organisationId') organisationId: number,
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
    ): Promise<CrudResponse<User>> {
        return this.umpireService.findManyByCompetitionIdForOrganisation(competitionId, organisationId);
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
