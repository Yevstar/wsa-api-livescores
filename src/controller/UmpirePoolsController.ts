import {Body, Get, HttpCode, JsonController, Param, Patch, Post} from "routing-controllers";
import {BaseController} from "./BaseController";
import {UmpirePool} from "../models/UmpirePool";

@JsonController('/competitions/:competitionId/umpires/pools')
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
        @Body() body: UmpirePool,
    ): Promise<UmpirePool> {
        return this.umpirePoolService.createOne(competitionId, body);
    }

    @Patch('/batch')
    async updateMany(
        @Param('competitionId') competitionId: number,
        @Body() body: UmpirePool[]
    ): Promise<UmpirePool[]> {
        return this.umpirePoolService.updateMany(competitionId, body);
    }
}