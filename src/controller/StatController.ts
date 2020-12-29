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

            return response.status(400).send(
                {name: 'search_error', message: `Team id required field`});
        }
    }

    @Authorized()
    @Post('/gametime')
    async gametime(
        @QueryParam('competitionId', {required: true}) competitionId: number,
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @QueryParam('aggregate', {required: true}) aggregate: ("MINUTE" | "PERIOD" | "MATCH"),
        @QueryParam('teamId') teamId: number = undefined,
        @QueryParam('matchId') matchId: number = undefined,
        @Body() requestFilter: RequestFilter,
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC" | "DESC" = undefined,
        @Res() response: Response
    ) {
        if (competitionId && aggregate && requestFilter) {
            return this.playerService.loadGameTime(
                competitionId,
                competitionOrganisationId,
                aggregate,
                teamId,
                matchId,
                requestFilter,
                sortBy,
                sortOrder
            );
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Required fields are missing`});
        }
    }

    @Authorized()
    @Get('/summaryScoringForTeam')
    async summaryScoringForTeam(
        @QueryParam('competitionId', {required: true}) competitionId: number,
        @QueryParam('divisionId', {required: true}) divisionId: number,
        @QueryParam('teamId', {required: true}) teamId: number,
        @Res() response: Response
    ) {
        if (competitionId && teamId && divisionId) {
            const noOfTeams = await this.teamService.findNumberOfTeams(divisionId);
            return this.teamService.summaryScoringStat(competitionId, teamId, divisionId, noOfTeams);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Required fields not filled`});
        }
    }

    @Authorized()
    @Get('/scoringByMatchForTeam')
    async scoringStatsByMatchForTeam(
        @QueryParam('competitionId', {required: true}) competitionId: number,
        @QueryParam('divisionId', {required: true}) divisionId: number,
        @QueryParam('teamId', {required: true}) teamId: number,
        @QueryParam('matchId', {required: true}) matchId: number,
        @Res() response: Response
    ) {
        if (competitionId && teamId && divisionId) {
            const noOfMatches = await this.matchService.findNumberOfMatches(divisionId);
            return this.teamService.scoringStatsByMatch(competitionId, teamId, matchId, divisionId, noOfMatches);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Required fields not filled`});
        }
    }

    @Authorized()
    @Get('/scoringByPlayer')
    async scoringStatsByPlayer(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @QueryParam('divisionId') divisionId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('aggregate') aggregate: ("ALL" | "MATCH"),
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
        @QueryParam('search') search: string,
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC" | "DESC" = undefined,
        @Res() response: Response
    ) {
        if (!competitionId) {
            return response.status(400).send(
                {name: 'search_error', message: `CompetitionId data is missing`});
        }
        if (playerId && !divisionId) {
            return response.status(400).send(
                {name: 'search_error', message: `DivisionId data is missing`});
        }

        let noOfTeams;
        if (divisionId) {
            noOfTeams = await this.teamService.findNumberOfTeams(divisionId);
        }
        const getScoringData = await this.teamService.scoringStatsByPlayer(
            competitionId,
            competitionOrganisationId,
            playerId,
            aggregate,
            offset,
            limit,
            search,
            divisionId,
            noOfTeams,
            sortBy,
            sortOrder
        );
        if (isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit) && isArrayPopulated(getScoringData.count)) {
            return { ...paginationData(stringTONumber(getScoringData.count[0]['totalCount']), limit, offset), result: getScoringData.finalData }
        } else {
            return getScoringData
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
            return response.status(400).send(
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
            return response.status(400).send(
                {name: 'search_error', message: `Required fields not filled`});
        }
    }

    @Authorized()
    @Get('/export/gametime')
    async exportTeamAttendance(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @QueryParam('aggregate', { required: true }) aggregate: ("MINUTE" | "PERIOD" | "MATCH"),
        @Res() response: Response
    ) {
        let gameTimeData = await this.playerService.loadGameTime(
            competitionId,
            competitionOrganisationId,
            aggregate,
            null,
            null,
            { paging: { offset: null, limit: null }, search: '' }
        );

        if (isArrayPopulated(gameTimeData)) {
            gameTimeData.map(e => {
                e['Player Id'] = e.player.id;
                e['First Name'] = e.firstName;
                e['Last Name'] = e.lastName;
                e['Team'] = e.team.name;
                e['DIV'] = e.division.name;
                e['Play Time'] = e.playTime;
                e['Play %'] = (e.playTimeTeamMatches == 0 || e.playTimeTeamMatches == null) ?
                  ("") :
                  ((100 * (e.playTime / e.playTimeTeamMatches)).toFixed(2) + '%');
                delete e.id;
                delete e.teamId;
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
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('divisionId') divisionId: number,
        @QueryParam('aggregate') aggregate: ("ALL" | "MATCH"),
        @QueryParam('search') search: string,
        @Res() response: Response
    ) {
        if (!competitionId) {
            return response.status(400).send(
                {name: 'missing_data', message: `Data missing for field competitionId`});
        }
        if (playerId && !divisionId) {
            return response.status(400).send(
                {name: 'missing_data', message: `Data missing for field divisionId`});
        }

        let noOfTeams;
        if (divisionId) {
            noOfTeams = await this.teamService.findNumberOfTeams(divisionId);
        }

        if (search === null || search === undefined) search = '';
        let playerScoreData = await this.teamService.scoringStatsByPlayer(
            competitionId,
            competitionOrganisationId,
            playerId,
            aggregate,
            null,
            null,
            search,
            divisionId,
            noOfTeams,
            null,
            null
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
            return response.status(400).send(
                {name: 'search_error', message: `CompetitionId, teamId & playerId are mandatory fields`});
        }
    }

    @Authorized()
    @Post('/positionTracking')
    async positionTracking(
        @QueryParam('aggregate') aggregate: ("MATCH" | "TOTAL"),
        @QueryParam('reporting') reporting: ("PERIOD" | "MINUTE"),
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @QueryParam('teamId') teamId: number = undefined,
        @QueryParam('matchId') matchId: number = undefined,
        @QueryParam('search') search: string = undefined,
        @Body() requestFilter: RequestFilter,
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC" | "DESC" = undefined,
        @Res() response: Response
    ) {
        if (isNotNullAndUndefined(competitionId)) {
            let competition = await this.competitionService.findById(competitionId);
            if (isNotNullAndUndefined(competition) && competition.positionTracking == true) {
                return this.gameTimeAttendanceService.loadPositionTrackingStats(
                    aggregate,
                    reporting,
                    competitionId,
                    competitionOrganisationId,
                    teamId,
                    matchId,
                    search,
                    requestFilter,
                    sortBy,
                    sortOrder
                );
            } else {
                // temporarily return blank rows till front end sorts it out
                return this.gameTimeAttendanceService.loadPositionTrackingStats(
                    aggregate,
                    reporting,
                    0,
                    0,
                    teamId,
                    matchId,
                    search,
                    requestFilter,
                    sortBy,
                    sortOrder
                );
                //return response.status(200).send( {name: 'search_error', message: `Position tracking is not enabled for this competition`});
            }
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Missing required parameters`});
        }
    }

    @Authorized()
    @Get('/positionTracking/export')
    async positionTrackingExport(
        @QueryParam('aggregate') aggregate: ("MATCH" | "TOTAL"),
        @QueryParam('reporting') reporting: ("PERIOD" | "MINUTE"),
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @Res() response: Response
    ) {
        if (isNotNullAndUndefined(competitionId)) {
            var gameTimeAttendanceData;
            let competition = await this.competitionService.findById(competitionId);
            if (isNotNullAndUndefined(competition) && competition.positionTracking == true) {
                gameTimeAttendanceData = await this.gameTimeAttendanceService.loadPositionTrackingStats(
                    aggregate,
                    reporting,
                    competitionId,
                    competitionOrganisationId,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
                );
            } else {
                // temporarily return blank rows till front end sorts it out
                gameTimeAttendanceData = await this.gameTimeAttendanceService.loadPositionTrackingStats(
                    aggregate,
                    reporting,
                    0,
                    0,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
                );
            }

            gameTimeAttendanceData.map(gta => {
                gta['Match ID'] = gta['match']['id'];
                gta['Team'] = gta['team']['name'];
                gta['First Name'] = gta['player']['firstName'];
                gta['Last Name'] = gta['player']['lastName'];
                gta['GS'] = gta['gs'];
                gta['GA'] = gta['ga'];
                gta['WA'] = gta['wa'];
                gta['C'] = gta['c'];
                gta['WD'] = gta['wd'];
                gta['GD'] = gta['gd'];
                gta['GK'] = gta['gk'];
                gta['Played'] = gta['play'];
                gta['Bench'] = gta['bench'];
                gta['No Play'] = gta['noplay'];

                delete gta['team'];
                delete gta['player'];
                delete gta['playDuration'];
                delete gta['gs'];
                delete gta['ga'];
                delete gta['wa'];
                delete gta['c'];
                delete gta['wd'];
                delete gta['gd'];
                delete gta['gk'];
                delete gta['i'];
                delete gta['play'];
                delete gta['bench'];
                delete gta['noplay'];
                delete gta['match'];

                return gta;
            });

            if (!isNotNullAndUndefined(gameTimeAttendanceData) ||
                gameTimeAttendanceData.length == 0) {
                      gameTimeAttendanceData.push({
                          ['Match ID']: '',
                          ['Team']: '',
                          ['First Name']: '',
                          ['Last Name']: '',
                          ['GS']: '',
                          ['GA']: '',
                          ['WA']: '',
                          ['C']: '',
                          ['WD']: '',
                          ['GD']: '',
                          ['GK']: '',
                          ['Played']: '',
                          ['Bench']: '',
                          ['No Play']: ''
                    });
            }

            response.setHeader('Content-disposition', 'attachment; filename=positionTrackingReport.csv');
            response.setHeader('content-type', 'text/csv');
            fastcsv.write(gameTimeAttendanceData, { headers: true })
                .on('finish', function () {
                })
                .pipe(response);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Missing required parameters`});
        }
    }
}
