import {
    Authorized,
    BodyParam,
    Get,
    JsonController,
    OnUndefined,
    Param,
    Patch,
    QueryParam,
    Req
} from "routing-controllers";
import {BaseController} from "./BaseController";
import {UmpireCompetitionRank} from "../models/UmpireCompetitionRank";
import {CrudResponse} from "./dto/CrudResponse";
import {User} from "../models/User";
import {RequiredQueryParam} from "../decorators/RequiredQueryParamDecorator";
import {UmpiresSortType, UpdateRankType} from "../services/UmpireService";

@JsonController('/competitions/:competitionId/umpires')
@Authorized()
export class UmpireController extends BaseController {

    @Get()
    async index(
        @Param('competitionId') competitionId: number,
        @RequiredQueryParam('organisationId') organisationId: number,
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
        @QueryParam('skipAssignedToPools') skipAssignedToPools: boolean = false,
        @QueryParam('sortBy', { required: false }) sortBy?: UmpiresSortType,
        @QueryParam('sortOrder', { required: false }) sortOrder?: "ASC" | "DESC",
    ): Promise<CrudResponse<User>> {
        const crudResponse = await this.umpireService.findManyByCompetitionIdForOrganisation(
            competitionId,
            organisationId,
            offset,
            limit,
            skipAssignedToPools,
            sortBy,
            sortOrder,
        );

        crudResponse.data = await this.umpireService.addOrganisationNameToUmpiresWithURE(crudResponse.data);

        return crudResponse;
    }

    @OnUndefined(204)
    @Patch('/:umpireId/rank')
    updateRank(
        @Param('competitionId') competitionId: number,
        @Param('umpireId') umpireId: number,
        @RequiredQueryParam('organisationId') organisationId: number,
        @BodyParam('rank', {required: true}) rank: number,
        @BodyParam('updateRankType') updateRankType: UpdateRankType,
    ): Promise<UmpireCompetitionRank> {

        return this.umpireService.updateRank(organisationId, competitionId, umpireId, rank, updateRankType);
    }
}
