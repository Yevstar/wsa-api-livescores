import {
    Authorized,
    Body, BodyParam,
    Get,
    HttpCode,
    JsonController,
    Param,
    Patch,
    Post,
    QueryParam
} from "routing-controllers";
import {BaseController} from "./BaseController";
import {UmpirePool} from "../models/UmpirePool";
import {RequiredQueryParam} from "../decorators/RequiredQueryParamDecorator";

@JsonController('/competitions/:competitionId/umpires/pools')
@Authorized()
export class UmpirePoolsController extends BaseController {

    @Get()
    async index(
        @Param('competitionId') competitionId: number,
        @RequiredQueryParam('organisationId') organisationId: number,
    ): Promise<UmpirePool[]> {
        return this.umpirePoolService.getByCompetitionOrganisation(competitionId, organisationId);
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
        @QueryParam('organisationId') organisationId: number,
        @Body() body: UmpirePool[]
    ): Promise<UmpirePool[]> {
        return this.umpirePoolService.updateMany(organisationId, competitionId, body);
    }

    @Post('/:umpirePoolId/add')
    async addUmpire(
        @Param('competitionId') competitionId: number,
        @Param('umpirePoolId') umpirePoolId: number,
        @BodyParam('umpireId') umpireId: number,
        @RequiredQueryParam('organisationId') organisationId: number,
    ): Promise<UmpirePool>  {
        return this.umpirePoolService.addUmpireToPool(organisationId, competitionId, umpirePoolId, umpireId)
    }
}
