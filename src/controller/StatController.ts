import {Authorized, Get, JsonController, QueryParam, Res, HeaderParam, Body, Post} from 'routing-controllers';
import {Response} from "express";
import {BaseController} from "./BaseController";
import {User} from "../models/User";
import {RequestFilter} from "../models/RequestFilter";
import { request } from 'http';
import * as fastcsv from 'fast-csv';
import { isArrayPopulated, paginationData, isNotNullAndUndefined, stringTONumber } from '../utils/Utils';

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
        @QueryParam('divisionId', {required: true}) divisionId: number = undefined,
        @QueryParam('teamId', {required: true}) teamId: number = undefined,
        @Res() response: Response
    ) {
        if (competitionId && teamId && divisionId) {
            const noOfTeams = await this.teamService.findNumberOfTeams(divisionId);
            return this.teamService.summaryScoringStat(competitionId, teamId, divisionId, noOfTeams);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields not filled`});
        }
    }

    @Authorized()
    @Get('/scoringByMatchForTeam')
    async scoringStatsByMatchForTeam(
        @QueryParam('competitionId', {required: true}) competitionId: number = undefined,
        @QueryParam('divisionId', {required: true}) divisionId: number = undefined,
        @QueryParam('teamId', {required: true}) teamId: number = undefined,
        @QueryParam('matchId', {required: true}) matchId: number = undefined,
        @Res() response: Response
    ) {
        if (competitionId && teamId && divisionId) {
            const noOfMatches = await this.matchService.findNumberOfMatches(divisionId);
            return this.teamService.scoringStatsByMatch(competitionId, teamId, matchId, divisionId, noOfMatches);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields not filled`});
        }
    }

    @Authorized()
    @Get('/scoringByPlayer')
    async scoringStatsByPlayer(
        @QueryParam('competitionId', { required: true }) competitionId: number = undefined,
        @QueryParam('divisionId', { required: true }) divisionId: number = undefined,
        @QueryParam('playerId') playerId: number = undefined,
        @QueryParam('aggregate') aggregate: ("ALL" | "MATCH"),
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
        @QueryParam('search') search: string,
        @Res() response: Response) {
        if (competitionId && divisionId) {
            const noOfTeams = await this.teamService.findNumberOfTeams(divisionId);
            const getScoringData = await this.teamService.scoringStatsByPlayer(
                competitionId,
                playerId,
                aggregate,
                offset,
                limit,
                search,
                divisionId,
                noOfTeams
            );
            if (isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit) && isArrayPopulated(getScoringData.count)) {
                return { ...paginationData(stringTONumber(getScoringData.count[0]['totalCount']), limit, offset), result: getScoringData.finalData }
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
        @QueryParam('competitionId', { required: true }) competitionId: number = undefined,
        @QueryParam('aggregate', { required: true }) aggregate: ("GAME" | "MATCH" | "PERIOD"),
        @Res() response: Response) {

        let gameTimeData = await this.playerService.loadGameTime(competitionId, aggregate, { paging: { offset: null, limit: null }, search: '' });

        if (isArrayPopulated(gameTimeData)) {
            gameTimeData.map(e => {
                e['Player Id'] = e.player.id;
                e['First Name'] = e.firstName;
                e['Last Name'] = e.lastName;
                e['Team'] = e.team.name;
                e['DIV'] = e.division.name;
                e['Play Time'] = e.playTime;
                e['Play %'] = (e.playTimeTeamMatches == 0 || e.playTimeTeamMatches == null) ? ("") : ((100 * (e.playTime / e.playTimeTeamMatches)).toFixed(2) + '%');
                delete e.division;
                delete e.player;
                delete e.team;
                delete e.firstName;
                delete e.lastName;
                delete e.playTime;
                delete e.playTimeTeamMatches;
                return e;
            });
        } else {
            gameTimeData.push({
                ['Player Id']: 'N/A',
                ['First Name']: 'N/A',
                ['Last Name']: 'N/A',
                ['Team']: 'N/A',
                ['DIV']: 'N/A',
                ['Play Time']: 'N/A',
                ['Play %']: 'N/A'
            });
        }

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
        @QueryParam('divisionId', { required: true }) divisionId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('aggregate') aggregate: ("ALL" | "MATCH"),
        @QueryParam('search') search: string,
        @Res() response: Response
    ) {
        if (competitionId) {
            if (search === null || search === undefined) search = '';
            const noOfTeams = await this.teamService.findNumberOfTeams(divisionId);
            let playerScoreData = await this.teamService.scoringStatsByPlayer(
                competitionId,
                playerId,
                aggregate,
                null,
                null,
                search,
                divisionId,
                noOfTeams
            );

            if (isArrayPopulated(playerScoreData)) {
                playerScoreData.map(e => {
                    e['Match Id'] = e.matchId;
                    e['Date'] = e.startTime;
                    e['Team'] = e.teamName;
                    e['First Name'] = e.firstName;
                    e['Last Name'] = e.lastName;
                    e['Position'] = e.gamePositionName;
                    e['Misses'] = e.miss;
                    e['Goals'] = e.goal;
                    e['Goals %'] = (e.goal_percent * 100).toFixed(2);

                    delete e.firstName;
                    delete e.gamePositionName;
                    delete e.goal;
                    delete e.goal_percent;
                    delete e.lastName;
                    delete e.matchId;
                    delete e.miss;
                    delete e.mnbPlayerId;
                    delete e.penalty_miss;
                    delete e.playerId;
                    delete e.startTime;
                    delete e.team1Name;
                    delete e.team2Name;
                    delete e.teamId;
                    delete e.teamName;
                    return e;
                });
            } else {
                playerScoreData.push({
                    ['Match Id']: 'N/A',
                    ['Date']: 'N/A',
                    ['Team']: 'N/A',
                    ['First Name']: 'N/A',
                    ['Last Name']: 'N/A',
                    ['Position']: 'N/A',
                    ['Misses']: 'N/A',
                    ['Goals']: 'N/A',
                    ['Goals %']: 'N/A'
                });
            }

            response.setHeader('Content-disposition', 'attachment; filename=scoringByPlayer.csv');
            response.setHeader('content-type', 'text/csv');
            fastcsv.write(playerScoreData, { headers: true })
                .on("finish", function () { })
                .pipe(response);
        } else {
            return response.status(212).send(
                { name: 'search_error', message: `Required fields not filled` });
        }
    }

    @Authorized()
    @Get('/borrowsForPlayer')
    async borrowsForPlayer(
        @QueryParam('playerId', {required: true}) playerId: number = undefined,
        @Res() response: Response
    ) {
        if (playerId) {
            return this.playerService.loadBorrowsForPlayer(playerId);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `CompetitionId, teamId & playerId are mandatory fields`});
        }
    }

    @Authorized()
    @Post('/positionTracking')
    async positionTracking(
        @QueryParam('aggregate') aggregate: ("MATCH" | "TOTAL"),
        @QueryParam('reporting') reporting: ("PERIOD" | "MINUTE"),
        @QueryParam('competitionId', {required: true}) competitionId: number = undefined,
        @QueryParam('teamId') teamId: number = undefined,
        @QueryParam('search') search: string = undefined,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response) {
        if (competitionId) {
            return this.gameTimeAttendanceService.loadPositionTrackingStats(aggregate, reporting, competitionId, teamId, search, requestFilter);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Competition id required field`});
        }
    }
}
