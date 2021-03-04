import {
    Authorized, Body,
    Get,
    JsonController,
    Param, Params,
    Patch,
    QueryParam, QueryParams, Res,
} from "routing-controllers";
import {BaseController} from "./BaseController";
import {CrudResponse} from "./dto/CrudResponse";
import {User} from "../models/User";
import {RequiredQueryParam} from "../decorators/RequiredQueryParamDecorator";
import {DetailedUmpire, UmpiresSortType} from "../services/UmpireService";
import {RankUmpireDto} from "./dto/RankUmpireDto";
import {Response} from 'express';
import {RankUmpireQueryParams} from "./dto/RankUmpireQueryParams";
import {RankUmpireRouteParams} from "./dto/RankUmpireRouteParams";
import {Umpire} from "../models/Umpire";
import {UmpireDetailsPathParams} from "./dto/UmpireDetailsPathParams";
import {OrganisationQueryParam} from "./dto/OrganisationQueryParam";

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

    @Get('/:umpireId')
    async getDetailedUmpire(
        @Params() params: UmpireDetailsPathParams,
        @QueryParams() queryParams: OrganisationQueryParam,
        @Res() response: Response,
    ): Promise<DetailedUmpire> {
        const {competitionId, umpireId} = await this.validate(response, params, UmpireDetailsPathParams);
        const {organisationId} = await this.validate(response, queryParams, OrganisationQueryParam);

        return await this.umpireService.getDetailedUmpire(competitionId, umpireId, organisationId);
    }

    @Patch('/:umpireId/rank')
    async updateRank(
        @Params() params: RankUmpireRouteParams,
        @QueryParams() queryParams: RankUmpireQueryParams,
        @Body() rankUmpireDto: RankUmpireDto,
        @Res() response: Response,
    ): Promise<boolean> {
        rankUmpireDto = await this.validate(response, rankUmpireDto, RankUmpireDto);
        const {organisationId} = await this.validate(response, queryParams, RankUmpireQueryParams);
        const {competitionId, umpireId} = await this.validate(response, params, RankUmpireRouteParams);
        await this.umpireService.updateRank(organisationId, competitionId, umpireId, rankUmpireDto);

        return true;
    }
}
