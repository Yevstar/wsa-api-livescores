import {
    Authorized,
    Body,
    ForbiddenError,
    Get,
    HttpCode,
    JsonController,
    Param, ParamOptions,
    Patch,
    Post,
    QueryParam
} from "routing-controllers";
import {BaseController} from "./BaseController";
import {UmpirePool} from "../models/UmpirePool";
import {CompetitionParticipatingTypeEnum} from "../models/enums/CompetitionParticipatingTypeEnum";
import {RequiredQueryParam} from "../decorators/RequiredQueryParamDecorator";

@JsonController('/competitions/:competitionId/umpires/pools')
//@Authorized()
export class UmpirePoolsController extends BaseController {

    @Get()
    async index(
        @Param('competitionId') competitionId: number,
    ): Promise<UmpirePool[]> {
        return this.umpirePoolService.getByCompetitionId(competitionId);
    }

    @Post()
    @HttpCode(201)
    async createOne(
        @Param('competitionId') competitionId: number,
        @RequiredQueryParam('organisationId') organisationId: number,
        @Body() body: UmpirePool,
    ): Promise<UmpirePool> {
        return this.umpirePoolService.createOne(organisationId, competitionId, body);
    }

    @Patch('/batch')
    async updateMany(
        @Param('competitionId') competitionId: number,
        @QueryParam('organizationId') organizationId: number,
        @Body() body: UmpirePool[]
    ): Promise<UmpirePool[]> {
        return this.umpirePoolService.updateMany(organizationId, competitionId, body);
    }
}