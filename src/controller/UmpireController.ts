import {BodyParam, JsonController, Param, Patch} from "routing-controllers";
import {BaseController} from "./BaseController";
import {UmpireCompetitionRank} from "../models/UmpireCompetitionRank";

@JsonController('/competitions/:competitionId/umpires')
export class UmpireController extends BaseController {

    @Patch('/:umpireId/rank')
    async updateRank(
        @Param('competitionId') competitionId: number,
        @Param('umpireId') umpireId: number,
        @BodyParam('rank', {required: true}) rank: number,
    ): Promise<UmpireCompetitionRank> {
        return this.umpireService.updateRank(competitionId, umpireId, rank)
    }
}