import {Authorized, Get, JsonController, QueryParam, Res, HeaderParam, Body, Post} from 'routing-controllers';
import {Response} from "express";
import {BaseController} from "./BaseController";
import {User} from "../models/User";
import {RequestFilter} from "../models/RequestFilter";
import { request } from 'http';
import * as fastcsv from 'fast-csv';
import { isArrayEmpty, paginationData, isNotNullAndUndefined, stringTONumber } from '../utils/Utils';

@Authorized()
@JsonController('/stats')
export class StatController extends BaseController {

    @Authorized()
    @Get('/playerMinutes')
    async playerMinutesStat(
        @QueryParam('matchId', {required: true}) matchId: number = undefined,
        @QueryParam('teamId', {required: true}) teamId: number = undefined,
        @QueryParam('aggregate') aggregate: ("GAME" | "MATCH" | "PERIOD"),
        @Res() response: Response) {
        if (teamId) {
            if (matchId) {
                return this.playerService.loadPlayersPlayStatByMatch(matchId, teamId);
            } else {
                return this.playerService.loadPlayersPlayStat(teamId);
            }
        } else {
        
            return response.status(200).send(
                {name: 'search_error', message: `Team id required field`});
        }
    }

    @Authorized()
    @Post('/gametime')
    async gametime(
        @QueryParam('competitionId', {required: true}) competitionId: number = undefined,
        @QueryParam('aggregate', {required: true}) aggregate: ("GAME" | "MATCH" | "PERIOD"),
        @Body() requestFilter: RequestFilter,
        @Res() response: Response) {
        if (competitionId && aggregate && requestFilter) {
                return this.playerService.loadGameTime(competitionId, aggregate, requestFilter);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields are missing`});
        }
    }

    @Authorized()
    @Get('/summaryScoringForTeam')
    async summaryScoringForTeam(
        @QueryParam('competitionId', {required: true}) competitionId: number = undefined,
        @QueryParam('teamId', {required: true}) teamId: number = undefined,
        @Res() response: Response) {
        if (competitionId && teamId) {
            return this.teamService.summaryScoringStat(competitionId, teamId);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields not filled`});
        }
    }

    @Authorized()
    @Get('/scoringByMatchForTeam')
    async scoringStatsByMatchForTeam(
        @QueryParam('competitionId', {required: true}) competitionId: number = undefined,
        @QueryParam('teamId', {required: true}) teamId: number = undefined,
        @QueryParam('matchId', {required: true}) matchId: number = undefined,
        @Res() response: Response) {
        if (competitionId && teamId) {
            return this.teamService.scoringStatsByMatch(competitionId, teamId, matchId);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields not filled`});
        }
    }

    @Authorized()
    @Get('/scoringByPlayer')
    async scoringStatsByPlayer(
        @QueryParam('competitionId', { required: true }) competitionId: number = undefined,
        @QueryParam('playerId') playerId: number = undefined,
        @QueryParam('aggregate') aggregate: ("ALL" | "MATCH"),
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
        @QueryParam('search') search: string,
        @Res() response: Response) {
        if (competitionId) {
            const getScoringData = await this.teamService.scoringStatsByPlayer(competitionId, playerId, aggregate, offset, limit, search);
            if (isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit) && isArrayEmpty(getScoringData.count)) {
                return { page: paginationData(stringTONumber(getScoringData.count[0]['totalCount']), limit, offset), result: getScoringData.finalData }
            } else {
                return getScoringData
            }
        } else {
            return response.status(200).send(
                { name: 'search_error', message: `Required fields not filled` });
        }
    }
    
    @Authorized()
    @Get('/incidentsByTeam')
    async incidentsByTeam(
        @QueryParam('competitionId', {required: true}) competitionId: number = undefined,
        @QueryParam('teamId', {required: true}) teamId: number = undefined,
        @Res() response: Response) {
        if (competitionId && teamId) {
            return this.teamService.incidentsByTeam(competitionId, teamId);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields not filled`});
        }
    }
    
    @Authorized()
    @Get('/borrowsFromTeam')
    async borrowsFromTeam(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', {required: true}) competitionId: number = undefined,
        @QueryParam('teamId', {required: true}) teamId: number = undefined,
        @Res() response: Response) {
        if (competitionId && teamId) {
            return this.playerService.loadPlayersBorrows(competitionId, teamId);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields not filled`});
        }
    }

    @Authorized()
    @Get('/export/gametime')
    async exportTeamAttendance(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number = undefined,
        @QueryParam('aggregate', { required: true }) aggregate: ("GAME" | "MATCH" | "PERIOD"),
        @Res() response: Response) {

        let gameTimeData = await this.playerService.loadGameTime(competitionId, aggregate, { paging: { offset: null, limit: null }, search: '' });
        response.setHeader('Content-disposition', 'attachment; filename=gametime.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv.write(gameTimeData, { headers: true })
            .on("finish", function () { })
            .pipe(response);
    }

    @Authorized()
    @Get('/export/scoringByPlayer')
    async exportScoringStatsByPlayer(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('aggregate') aggregate: ("ALL" | "MATCH"),
        @QueryParam('search') search: string,
        @Res() response: Response) {
        if (competitionId) {
            if (search === null || search === undefined) search = '';
            let playerScoreData = await this.teamService.scoringStatsByPlayer(competitionId, playerId, aggregate, null, null, search);
            response.setHeader('Content-disposition', 'attachment; filename=scoringByPlayer.csv');
            response.setHeader('content-type', 'text/csv');
            fastcsv.write(playerScoreData, { headers: true })
                .on("finish", function () { })
                .pipe(response);
        } else {
            return response.status(200).send(
                { name: 'search_error', message: `Required fields not filled` });
        }
    }
}
