import {Authorized, Get, Post, Body, JsonController, Param, QueryParam} from 'routing-controllers';
import {Round} from "../models/Round";
import {BaseController} from "./BaseController";

@JsonController('/round')
export class RoundController extends BaseController {

    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.roundService.findById(id);
    }

    @Authorized()
    @Get('/list')
    async findByMatchIds(
        @QueryParam('ids') roundIds: number[] = [],
    ): Promise<Round[]> {
        return this.roundService.findByIds(roundIds);
    }

    @Get('/')
    async find(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('divisionId') divisionId: number,
        @QueryParam('sequence') sequence: number,
        @QueryParam('teamIds') teamIds: number[] = [],
        @QueryParam('clubIds') clubIds: number[],
    ): Promise<Round[]> {
        return this.roundService.findByParam(competitionId, divisionId, sequence, teamIds, clubIds);
    }
    
    @Authorized()
    @Post('/')
    async create(
        @Body() round: Round
    ): Promise<Round> {
        const saved = await this.roundService.createOrUpdate(round);
        return saved;
    }
    
    @Authorized()
    @Get('/name')
    async findUniqueNames(
        @QueryParam('competitionId') competitionId: number,
    ): Promise<Round[]> {
        return this.roundService.findUniqueNames(competitionId);
    }

}

