import {
    Authorized, Body,
    Get,
    JsonController,
    Param,
    Patch,
    QueryParam, Res,
} from "routing-controllers";
import {BaseController} from "./BaseController";
import {CrudResponse} from "./dto/CrudResponse";
import {User} from "../models/User";
import {RequiredQueryParam} from "../decorators/RequiredQueryParamDecorator";
import {UmpiresSortType} from "../services/UmpireService";
import {RankUmpireDto} from "./dto/RankUmpireDto";
import {Response} from 'express';

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

    @Patch('/:umpireId/rank')
    async updateRank(
        @Param('competitionId') competitionId: number,
        @Param('umpireId') umpireId: number,
        @RequiredQueryParam('organisationId') organisationId: number,
        @Body() rankUmpireDto: RankUmpireDto,
        @Res() response: Response,
    ): Promise<boolean> {
        await this.validate(response, rankUmpireDto, RankUmpireDto);
        await this.umpireService.updateRank(organisationId, competitionId, umpireId, rankUmpireDto);

        return true;
    }
}
