import {Authorized, Body, Get, JsonController, Patch, Post, QueryParam, Res} from 'routing-controllers';
import {MatchUmpires} from '../models/MatchUmpires';
import {Response} from "express";
import {stringTONumber, paginationData} from "../utils/Utils";
import {BaseController} from "./BaseController";
import {RequestFilter} from "../models/RequestFilter";

@Authorized()
@JsonController('/matchUmpires')
export class MatchUmpiresController extends BaseController {

    @Get('/')
    async find(
        @QueryParam('matchIds') matchIds: number[]
    ): Promise<MatchUmpires[]> {
        return this.matchUmpireService.findByMatchIds(matchIds);
    }

    @Authorized()
    @Post('/admin')
    async findbyCompetition(
        @QueryParam('competitionId') competitionId: number,
        @Body() requestFilter: RequestFilter
    ): Promise<any> {

        const resultsFound = await this.matchUmpireService.findByCompetitionId(competitionId, requestFilter);
        if (resultsFound) {
            let responseObject = paginationData(stringTONumber(resultsFound.countObj), requestFilter.paging.limit, requestFilter.paging.offset)
            responseObject["matchUmpires"] = resultsFound.result;
            return responseObject;
        } else {
            return [];
        }
        
    }

    @Post('/')
    async create(
        @Body({required: true}) matchUmpires: MatchUmpires,
        @Res() response: Response) {
        if (matchUmpires.id) {
            let umpires = await this.matchUmpireService.getById(matchUmpires.id);
            if (umpires) {
                if (umpires.match && umpires.match.matchStatus == 'ENDED') {
                    return response.status(400).send({
                        name: 'update_error',
                        message: 'Game umpires cannot be submitted after a match has ended'
                    });
                }
                return await this.matchUmpireService.createOrUpdate(matchUmpires);
            } else {
                return await this.createUmpire(matchUmpires, response);
            }
        } else {
            return await this.createUmpire(matchUmpires, response);
        }
    }

    private async createUmpire(matchUmpires, response) {
        let matchId = matchUmpires.matchId;
        let match = await this.matchService.findById(matchId);
        if (match && match.matchStatus == 'ENDED') {
            return response.status(400).send(
                {
                    name: 'create_error',
                    message: 'Game umpires cannot be submitted after a match has ended'
                });
        }

        if (matchId) {
            let count = await this.matchUmpireService.count(matchId)
            if (count == 0) {
                let umpires = await this.matchUmpireService.createOrUpdate(matchUmpires);
                let tokens = (await this.deviceService.findScorerDeviceFromRoster(matchId))
                    .map(device => device.deviceId);
                if (tokens && tokens.length > 0) {
                    this.firebaseService.sendMessageChunked({
                        tokens: tokens,
                        data: {
                            type: 'match_umpires_added',
                            matchId: matchId.toString(),
                            umpiresId: umpires.id.toString()
                        }
                    })
                }
                return umpires;
            } else {
                return response.status(400).send({
                    name: 'create_error',
                    message: `Umpires have been added to this match already`
                });
            }
        } else {
            return response.status(400).send({
                name: 'create_error',
                message: `Match ID is required field for umpires`
            });
        }
    }
}
