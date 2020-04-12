import {
    Authorized,
    Body,
    BodyParam,
    Get,
    HeaderParam,
    JsonController,
    Param,
    Patch,
    Post,
    QueryParam,
    Res,
    UploadedFiles,
    UploadedFile,
    Delete
} from 'routing-controllers';
import {Match} from '../models/Match';
import * as _ from 'lodash';
import {sendMatchUpdate} from '../socketServer';
import {MatchScores} from "../models/MatchScores";
import {Response} from "express";
import {BaseController} from "./BaseController";
import {logger} from "../logger";
import {User} from "../models/User";
import {contain, fileExt, isPhoto, isVideo, timestamp, stringTONumber, paginationData, isArrayEmpty} from "../utils/Utils";
import {Incident} from "../models/Incident";
import {Lineup} from "../models/Lineup";
import {IncidentPlayer} from "../models/IncidentPlayer";
import {Round} from "../models/Round";
import {RequestFilter} from "../models/RequestFilter";

@JsonController('/matches')
export class MatchController extends BaseController {

    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.matchService.findMatchById(id);
    }

    @Authorized()
    @Delete('/id/:id')
    async delete(
        @Param("id") id: number,
        @HeaderParam("authorization") user: User)
    {
            let match = await this.matchService.findById(id);
            let deletedMatch = await this.matchService.softDelete(id, user.id);
            this.sendMatchEvent(match);
            return deletedMatch;
    }

    @Authorized()
    @Get('/admin/:id')
    async getAdmin(@Param("id") id: number) {
        return this.matchService.findAdminMatchById(id);
    }

    @Get('/list')
    async findByMatchIds(
        @QueryParam('ids') matchIds: number[] = [],
    ): Promise<Match[]> {
        return this.matchService.findMatchByIds(matchIds);
    }

    @Get('/')
    async find(
        @QueryParam('from') from: Date,
        @QueryParam('to') to: Date,
        @QueryParam('teamIds') teamIds: number[] = [],
        @QueryParam('playerIds') playerIds: number[],
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('clubIds') clubIds: number[],
        @QueryParam('matchEnded') matchEnded: boolean,
        @QueryParam('matchStatus') matchStatus: ("STARTED" | "PAUSED" | "ENDED")[],
        @QueryParam('offset') offset: number = undefined,
        @QueryParam('limit') limit: number = undefined
    ): Promise<any> {
        // Add all teams of supplied players.
        if (playerIds) {
            teamIds = _.uniq([
                ...teamIds,
                ...(await this.playerService.findByIds(playerIds)).map(player => player.teamId)
            ]);
        }
        offset = stringTONumber(offset);
        limit = stringTONumber(limit);

        const matchFound = await this.matchService.findByParam(from, to, teamIds, playerIds, competitionId, clubIds, matchEnded, matchStatus, offset, limit);
        
        if (matchFound && limit) {
            let responseObject = paginationData(stringTONumber(matchFound.matchCount), limit, offset)
            responseObject["matches"] = matchFound.result;
            return responseObject;
        } else {
            return matchFound.result;
        }
    }

    @Get('/home')
    async loadHomeMatches(
        @QueryParam('clubIds') clubIds: number[],
        @QueryParam('teamIds') teamIds: number[] = [],
        @QueryParam('playerIds') playerIds: number[],
        @QueryParam('upcomingCount') upcomingCount: number,
        @QueryParam('upcomingStartTimeRange') upcomingStartTimeRange: number = undefined,
        @QueryParam('endTimeRange') endTimeRange: number
    ): Promise<{ live: Match[], upcoming: Match[], ended: Match[] }> {
        if (clubIds && !Array.isArray(clubIds)) clubIds = [clubIds];
        if (teamIds && !Array.isArray(teamIds)) teamIds = [teamIds];
        if (playerIds && !Array.isArray(playerIds)) playerIds = [playerIds];
        if ((playerIds && playerIds.length > 0) || (clubIds && clubIds.length > 0) || (teamIds && teamIds.length > 0)) {
            if (playerIds && playerIds.length > 0) {
                teamIds = _.uniq([
                    ...teamIds,
                    ...(await this.playerService.findByIds(playerIds)).map(player => player.teamId)
                ]);
            }
            const live = await this.matchService.loadHomeLive(clubIds, teamIds);
            let upcoming = await this.matchService.loadHomeUpcoming(clubIds, teamIds, upcomingStartTimeRange);
            if (upcomingCount != undefined && upcomingCount != 0) {
                let teams = teamIds;
                if (clubIds && clubIds.length > 0) {
                    teams = _.uniq([
                        ...teamIds,
                        ...(await this.teamService.teamIdsByClubIds(clubIds)).map(data => data['id'])
                    ]);
                }
                let filtered: Match[] = [];
                for (const mh of upcoming) {
                    if (!filtered.some(el => el.id === mh.id)) {
                        let team1 = mh.team1Id;
                        let team2 = mh.team2Id;
                        let t1 = contain(teams, team1) ? filtered.filter(m => m.team1Id == team1).length : upcomingCount;
                        let t2 = contain(teams, team2) ? filtered.filter(m => m.team2Id == team2).length : upcomingCount;
                        if (t1 < upcomingCount || t2 < upcomingCount) {
                            filtered.push(mh)
                        }
                    }
                }
                upcoming = filtered;
            }
            const ended = endTimeRange ? await this.matchService.loadHomeEnded(clubIds, teamIds, endTimeRange) : [];
            return {live, upcoming, ended};
        } else {
            return {live: [], upcoming: [], ended: []}
        }
    }

    @Post('/admin')
    async admin(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('teamId') teamId: number,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response
    ): Promise<any> {
        // Add all teams of supplied players.
        if (competitionId && requestFilter) {
            return this.matchService.loadAdmin(competitionId, teamId, requestFilter);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields are missing`});
        }
    }

    @Post('/dashboard')
    async loadDashboard(
        @QueryParam('competitionId') competitionId: number,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response
    ): Promise<any> {
        // Add all teams of supplied players.
        if (competitionId && requestFilter) {
            return this.matchService.loadDashboard(competitionId, new Date(), requestFilter);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields are missing`});
        }
    }

    @Authorized()
    @Get('/competition')
    async byCompetition(
        @QueryParam('id', {required: true}) id: number,
        @QueryParam('start') start: Date,
        @QueryParam('end') end: Date,
        @Res() response: Response) {
        if (!start && !end) return response.status(400)
            .send({name: 'param_error', message: 'Start or end must be filled'});
        const live = await this.matchService.loadCompetitionAndDate(id, start, end, true);
        const upcoming = await this.matchService.loadCompetitionAndDate(id, start, end, false);
        return {live: live, upcoming: upcoming}
    }

    @Authorized()
    @Post('/')
    async create(
        @QueryParam('userId') userId: number = null,
        @Body() match: Match
    ): Promise<Match> {
        if (userId) {
            const matchScores = new MatchScores();
            matchScores.userId = userId;
            matchScores.matchId = match.id;
            matchScores.team1Score = match.team1Score;
            matchScores.team2Score = match.team2Score;
            await this.matchScorerService.createOrUpdate(matchScores);
        }
        const saved = await this.matchService.createOrUpdate(match);
        sendMatchUpdate(saved);
        return saved;
    }

    @Authorized()
    @Post('/periodScores')
    async addMatchScores(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId') matchId: number,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('startedMsFromStart') startedMsFromStart: number,
        @Body() scores: MatchScores,
        @Res() response: Response) {
        if (scores) {
            const result = await this.matchScorerService.findByMatchIdAndPeriod(scores.matchId, scores.period);
            const match = await this.matchService.findById(matchId);
            let saved: MatchScores;
            if (result) {
                scores.id = result.id;
                saved = await this.matchScorerService.createOrUpdate(scores);
            } else {
                if (scores.id) scores.id = null;
                saved = await this.matchScorerService.createOrUpdate(scores);
            }

            // return
            if (saved) {
                // log match event
                let eventTimestamp;
                if (startedMsFromStart != undefined) {
                    eventTimestamp = new Date(match.startTime.getTime() + startedMsFromStart);
                } else {
                    const periodDuration = match.matchDuration / (match.type == 'FOUR_QUARTERS' ? 4 : 2);
                    eventTimestamp = startedMsFromStart ?
                        new Date(match.startTime.getTime() + startedMsFromStart) :
                        new Date(Date.now() - periodDuration * 1000);
                }
                this.matchService.logMatchEvent(matchId, 'timer', 'periodStart', saved.period,
                    eventTimestamp, user.id);

                eventTimestamp = msFromStart ? new Date(match.startTime.getTime() + msFromStart) : Date.now();
                this.matchService.logMatchEvent(matchId, 'timer', 'periodEnd', saved.period,
                    eventTimestamp, user.id);
                return response.status(200).send({updated: true});
            } else {
                return response.status(412).send({
                    name: 'save_error', message: 'Undefined error'
                });
            }
        } else {
            return response.status(400).send({
                name: 'bad_request', message: 'Match scores can`t bbe null'
            });
        }
    }

    @Authorized()
    @Patch('/updateScore')
    async updateScore(
        @HeaderParam("authorization") user: User,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('matchId', {required: true}) matchId: number,
        @QueryParam('team1Score') team1Score: number,
        @QueryParam('team2Score') team2Score: number,
        @QueryParam('periodNumber') periodNumber: number,
        @QueryParam('teamSequence') teamSequence: number,
        @QueryParam('positionId') positionId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('gameStatCode') gameStatCode: string,
        @QueryParam('centrePassStatus') centrePassStatus: "TEAM1" | "TEAM2",
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);
        match.team1Score = team1Score;
        match.team2Score = team2Score;
        if (centrePassStatus) {
            match.centrePassStatus = centrePassStatus;
        }
        await this.matchService.createOrUpdate(match);
        this.sendMatchEvent(match, true, user);

        let eventTimestamp = msFromStart ?
            new Date(match.startTime.getTime() + msFromStart) : new Date(Date.now());
        this.matchService.logMatchEvent(matchId, 'score', 'update', periodNumber,
            eventTimestamp, user.id, 'team1score', team1Score.toString(),
            'team2score', team2Score.toString());
        if (gameStatCode) {
            this.matchService.logMatchEvent(matchId, 'stat', gameStatCode, periodNumber,
                eventTimestamp, user.id, 'team' + teamSequence, positionId.toString(),
                'playerId', playerId ? playerId.toString() : '');
        }
        return match;
    }

    @Authorized()
    @Post('/stats')
    async updateStats(
        @HeaderParam("authorization") user: User,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('matchId', {required: true}) matchId: number,
        @QueryParam('periodNumber') periodNumber: number,
        @QueryParam('teamSequence') teamSequence: number,
        @QueryParam('positionId') positionId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('gameStatCode') gameStatCode: string,
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);

        let eventTimestamp = msFromStart ?
            new Date(match.startTime.getTime() + msFromStart) : new Date(Date.now());
        this.matchService.logMatchEvent(matchId, 'stat', gameStatCode, periodNumber,
            eventTimestamp, user.id, 'team' + teamSequence, positionId.toString(),
            'playerId', playerId ? playerId.toString() : '');
        return match;
    }

    @Get('/periodScores')
    async loadMatchScores(@QueryParam('matchId') matchId: number): Promise<MatchScores[]> {
        if (matchId) {
            return this.matchScorerService.findByMatchId(matchId);
        } else {
            return [];
        }
    }

    @Authorized()
    @Post('/start')
    async startMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', {required: true}) matchId: number,
        @QueryParam('msFromStart') msFromStart: number,
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            match.originalStartTime = match.startTime;
            let startTime = msFromStart ? (match.startTime.getTime() + msFromStart) : Date.now();
            match.startTime = new Date(startTime);
            match.matchStatus = "STARTED";
            await this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Match with id ${matchId} not found`});
        }
        this.sendMatchEvent(match, false, user);
        await this.matchService.logLiteMatchEvent(matchId, 'timer', 'start', 1, match.startTime, user.id);
        return match;
    }

    @Authorized()
    @Post('/restart')
    async restartMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', {required: true}) matchId: number,
        @QueryParam('timeInMilliseconds') timeInMilliseconds: number,
        @QueryParam('clearAttendance') clearAttendance: boolean,
        @Res() response: Response) {

        let match = await this.matchService.findById(matchId);
        if (match) {
            match.team1Score = 0;
            match.team2Score = 0;

            match.originalStartTime = match.originalStartTime ? match.originalStartTime : match.startTime;
            let startTime = Date.now();
            startTime += timeInMilliseconds;
            match.startTime = new Date(startTime);
            match.team1ResultId = null;
            match.team2ResultId = null;
            match.matchEnded = false;
            match.endTime = null;
            match.matchStatus = "STARTED";
            match.pauseStartTime = null;
            match.totalPausedMs = 0;
            match.scorerStatus = "SCORER1";
            await this.matchService.createOrUpdate(match);
            await this.matchScorerService.deleteByMatchId(matchId);
            if (clearAttendance) {
                await this.gameTimeAttendanceService.deleteByMatchId(matchId);
                await this.attendanceService.deleteByMatchId(matchId);
                await this.matchUmpireService.deleteByMatchId(matchId);
            }
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Match with id ${matchId} not found`});
        }
        this.sendMatchEvent(match, false, user);
        await this.matchService.logLiteMatchEvent(matchId, 'timer', 'start', 1, match.startTime, user.id);
        return response.status(200).send({restarted: true});
    }

    @Authorized()
    @Post('/pause')
    async pauseMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', {required: true}) matchId: number,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('isBreak') isBreak: boolean,
        @QueryParam('period') period: number,
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            let pauseStartTime = msFromStart ? (match.startTime.getTime() + msFromStart) : Date.now();
            match.pauseStartTime = new Date(pauseStartTime);
            match.matchStatus = "PAUSED";
            await this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Match with id ${matchId} not found`});
        }
        this.sendMatchEvent(match, false, user);

        let eventTimestamp = msFromStart ? new Date(match.startTime.getTime() + msFromStart) : new Date(Date.now());
        this.matchService.logMatchEvent(matchId, 'timer', 'pause', period, eventTimestamp,
            user.id, 'isBreak', isBreak ? "true" : "false");
        return match;
    }

    @Authorized()
    @Post('/resume')
    async resumeMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', {required: true}) matchId: number,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('isBreak') isBreak: boolean,
        @QueryParam('period') period: number,
        @Res() response: Response) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            let millisecondsFromStart = msFromStart ? msFromStart : 0;
            let millisecond = match.pauseStartTime ? match.pauseStartTime.getTime() - match.startTime.getTime() : 0;
            match.totalPausedMs = match.totalPausedMs + millisecondsFromStart - (millisecond);
            match.matchStatus = "STARTED";
            await this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Match with id ${matchId} not found`});
        }
        this.sendMatchEvent(match, false, user);
        let eventTimestamp = msFromStart ? new Date(match.startTime.getTime() + msFromStart) : new Date(Date.now());
        this.matchService.logMatchEvent(matchId, 'timer', 'resume', period, eventTimestamp,
            user.id, 'isBreak', isBreak ? "true" : "false");
        return match;
    }

    @Authorized()
    @Post('/changeScorer')
    async changeScorer(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', {required: true}) matchId: number,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('period') period: number,
        @QueryParam('scorerStatus', {required: true}) scorerStatus: "SCORER1" | "SCORER2",
        @Res() response: Response) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            match.scorerStatus = scorerStatus;
            await this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Match with id ${matchId} not found`});
        }
        this.sendMatchEvent(match, false, user, "scorer_changed");
        let eventTimestamp = msFromStart ? new Date(match.startTime.getTime() + msFromStart) : new Date(Date.now());
        this.matchService.logMatchEvent(matchId, 'scorer', 'changed', period, eventTimestamp,
            user.id, 'scorerStatus', scorerStatus.toString());
        return match;
    }

    @Authorized()
    @Post('/end')
    async endMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('startedMsFromStart') startedMsFromStart: number,
        @BodyParam("match", {required: true}) match: Match,
        @BodyParam("score", {required: true}) scores: MatchScores,
        @Res() response: Response) {
        if (match) {
            const result = await this.matchScorerService.findByMatchIdAndPeriod(scores.matchId, scores.period);
            scores.id = result ? result.id : null;
            this.matchScorerService.createOrUpdate(scores);

            let endTime = Date.now();
            match.endTime = new Date(endTime);
            match.matchStatus = "ENDED";
            this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Match can not be empty`});
        }
        this.sendMatchEvent(match, false, user);

        // log match event
        let eventTimestamp;
        let time = new Date(match.startTime);
        if (startedMsFromStart) {
            eventTimestamp = new Date(time.getTime() + startedMsFromStart);
        } else {
            const periodDuration = match.matchDuration / (match.type == 'FOUR_QUARTERS' ? 4 : 2);
            eventTimestamp = startedMsFromStart ?
                new Date(time.getTime() + startedMsFromStart) :
                Date.now() - periodDuration * 1000;
        }
        this.matchService.logMatchEvent(match.id, 'timer', 'periodStart', scores.period,
            eventTimestamp, user.id);

        eventTimestamp = msFromStart ? new Date(time.getTime() + msFromStart) : Date.now();
        this.matchService.logMatchEvent(match.id, 'timer', 'periodEnd', scores.period,
            eventTimestamp, user.id);
        return match;
    }

    @Post('/broadcast')
    async broadcastMatch(
        @QueryParam('matchId', {required: true}) matchId: number,
        @Res() response: Response) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            this.sendMatchEvent(match);
        }
        return match;
    }

    async sendMatchEvent(match: Match, updateScore: boolean = false, user?: User, subtype?: string) {
        try {

            if (match) {
                var dataDict = {};
                dataDict["type"] = "match_updated";
                dataDict["matchId"] = match.id.toString();
                if (user) {
                    dataDict["userId"] = user.id.toString();
                }
                if (subtype) {
                    dataDict["subtype"] = subtype;
                }

                //send by roster and ure
                if (!updateScore) {
                    let userDevices = await this.deviceService.findDeviceByMatch(match);
                    let tokens = (userDevices).map(device => device.deviceId);
                    if (tokens && tokens.length > 0) {
                        this.firebaseService.sendMessageChunked({
                            tokens: tokens,
                            data: dataDict
                        })
                    }
                }

                if (updateScore) {
                    dataDict["type"] = "match_score_updated";
                    dataDict["team1Score"] = match.team1Score.toString();
                    dataDict["team2Score"] = match.team2Score.toString();
                    dataDict["updatedAt"] = Date.now().toString();
                    if (match.centrePassStatus) {
                        dataDict["centrePassStatus"] = match.centrePassStatus.toString();
                    }
                }

                logger.debug('Prepare data for update match message', dataDict);
                let list = await this.watchlistService.loadByParam(match.id, [match.team1Id, match.team2Id]);
                let tokens = (list).map(wl => wl['token']);
                logger.debug('Load device tokens', tokens);
                if (tokens && tokens.length > 0) {
                    this.firebaseService.sendMessageChunked({tokens: tokens, data: dataDict})
                }
            } else {
                logger.debug(`Cannot send message for empty match`);
            }
        } catch (e) {
            logger.error(`Failed send message for match ${match.id}`, e);
        }
    }

    @Authorized()
    @Post('/changeCentrePass')
    async changeCentrePass(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', {required: true}) matchId: number,
        @QueryParam('centrePassStatus', {required: true}) centrePassStatus: "TEAM1" | "TEAM2",
        @QueryParam('centrePassWonBy') centrePassWonBy: "TEAM1" | "TEAM2",
        @Res() response: Response) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            match.centrePassStatus = centrePassStatus;
            if (centrePassWonBy) {
                match.centrePassWonBy = centrePassWonBy;
            }
            this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send(
                {name: 'search_error', message: `Match with id ${matchId} not found`});
        }
        this.sendMatchEvent(match, false, user, "centre_pass_changed");
        return match;
    }

    @Authorized()
    @Post('/incident')
    async addIncident(
        @QueryParam('playerIds', {required: true}) playerIds: number[] = undefined,
        @BodyParam("incident", {required: true}) incident: Incident,
        @Res() response: Response) {
        try {
            if (incident) {
                if (incident.id)
                    return response.status(400).send({
                        name: 'validation_error',
                        message: `Update incident not supported`
                    });
                if (!incident.matchId)
                    return response.status(400).send({
                        name: 'validation_error',
                        message: `Match id required parameter`
                    });
                if (!incident.competitionId)
                    return response.status(400).send({
                        name: 'validation_error',
                        message: `Competition id required parameter`
                    });
                if (!incident.teamId)
                    return response.status(400).send({
                        name: 'validation_error',
                        message: `Team id required parameter`
                    });
                if (!incident.incidentTypeId)
                    return response.status(400).send({
                        name: 'validation_error',
                        message: `Incident type id required parameter`
                    });
                const result = await this.matchService.saveIncident(incident);
                // save player incidents
                let save: IncidentPlayer[] = [];
                if (playerIds && !Array.isArray(playerIds)) playerIds = [playerIds];
                for (const playerId of playerIds) {
                    save.push(new IncidentPlayer(playerId, result.id));
                }
                await this.matchService.batchSavePlayersIncident(save);
                return response.status(200).send({success: true, incidentId: result.id});
            } else {
                return response.status(400).send(
                    {name: 'validation_error', message: `Incident can not be null`});
            }
        } catch (e) {
            logger.error(`Failed to create incident`, e);
            return response.status(400).send(
                {name: 'validation_error', message: `Failed to create incident`});
        }
    }

    @Authorized()
    @Post('/incidentMedia')
    async uploadIncidentMedia(
        @HeaderParam("authorization") user: User,
        @QueryParam("incidentId", {required: true}) incidentId: number,
        @UploadedFiles("media", {required: true}) files: Express.Multer.File[],
        @Res() response: Response) {
        try {
            if (files && files.length > 0) {
                let result = [];
                let media = [];
                let containsWrongFormat;

                /// Checking if we have any wrong format files in the list
                for (const file of files) {
                  if (isPhoto(file.mimetype) || isVideo(file.mimetype)) {
                    containsWrongFormat = false;
                  } else {
                    containsWrongFormat = true;
                    break;
                  }
                }

                /// If any wrong format file in the list then fail the upload
                if (containsWrongFormat) {
                  return response.status(400).send({
                      success: false,
                      name: 'upload_error',
                      message: `Please upload an image or video in any of these formats: JPG, PNG, MP4, QUICKTIME, MPEG, MP2T, WEBM, OGG, X-MS-WMV, X-MSVIDEO, 3GPP, or 3GPP2.`
                  });
                }

                for (const file of files) {
                    logger.debug(file.originalname);
                    let filename = `/incidents/i${incidentId}_u${user.id}_${timestamp()}.${fileExt(file.originalname)}`;
                    let upload = await this.firebaseService.upload(filename, file);
                    if (upload) {
                        let url = `${upload['url']}?alt=media`;
                        media.push(this.matchService.createIncidentMedia(incidentId, user.id, url, file.mimetype));
                        result.push({file: file.originalname, success: true})
                    } else {
                        result.push({file: file.originalname, success: false})
                    }
                }
                await this.matchService.saveIncidentMedia(media);
                return response.status(200).send({success: true, data: result});
            } else {
                return response.status(400).send({
                    success: false,
                    name: 'upload_error',
                    message: `Incident media required`
                });
            }
        } catch (e) {
            logger.error(`Failed to create incident media`, e);
            return response.status(400).send({
                success: false,
                name: 'upload_error',
                message: `Fail upload incident media`
            });
        }
    }

    @Authorized()
    @Get('/incident')
    async loadIncidents(
        @QueryParam('matchId') matchId: number,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('teamId', {required: true}) teamId: number,
        @QueryParam('playerId', {required: true}) playerId: number,
        @QueryParam('incidentTypeId') incidentTypeId: number,
        @Res() response: Response) {
        return this.matchService.findIncidentsByParam(matchId, competitionId, teamId, playerId, incidentTypeId);
    }

    @Authorized()
    @Post('/lineup')
    async saveLineup(
        @QueryParam('teamId') teamId: number = undefined,
        @QueryParam('matchId') matchId: number = undefined,
        @BodyParam("lineups", {required: true}) lineups: Lineup[],
        @Res() response: Response) {
        try {
            if (lineups) {
                if (teamId && matchId) {
                    await this.matchService.deleteLineups(matchId, teamId);
                } else if ((!teamId && matchId) || (teamId && !matchId)) {
                    return response.status(400).send(
                        {name: 'validation_error', message: `Match Id and team Id can not be null`});
                }
                await this.matchService.batchSaveLineups(lineups);
                return response.status(200).send({success: true});
            } else {
                return response.status(400).send(
                    {name: 'validation_error', message: `Lineups can not be null`});
            }
        } catch (e) {
            logger.error(`Failed to create lineup`, e);
            return response.status(400).send(
                {name: 'validation_error', message: `Failed to create lineup`});
        }
    }

    @Authorized()
    @Get('/lineup')
    async loadLineups(
        @QueryParam('matchId', {required: true}) matchId: number,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('teamId', {required: true}) teamId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('positionId') positionId: number,
        @Res() response: Response) {
        return this.matchService.findLineupsByParam(matchId, competitionId, teamId, playerId, positionId);
    }
    
    @Authorized()
    @Post('/bulk/end')
    async bulkUpdate(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('startTimeStart', { required: true }) startTimeStart: Date,
        @QueryParam('startTimeEnd', { required: true }) startTimeEnd: Date,
        @QueryParam('resultTypeId') resultTypeId: number,
        @Res() response: Response
    ) {
        let matchesData = await this.matchService.findByDate(new Date(startTimeStart), new Date(startTimeEnd))

        let arr = [];
        if (resultTypeId) {
            for (let match of matchesData) {
                match.team1ResultId = resultTypeId;
                match.team2ResultId = resultTypeId;
                arr.push(match);
            }
        } else {
            for (let match of matchesData) {
                if (match.team1Score != null && match.team2Score != null) {
                    if (match.team1Score > match.team2Score) {
                        match.team1ResultId = 1;
                        match.team2ResultId = 2;
                        arr.push(match);
                    } else if (match.team2Score > match.team1Score) {
                        match.team1ResultId = 2;
                        match.team2ResultId = 1;
                        arr.push(match);
                    } else {
                        match.team1ResultId = 3;
                        match.team2ResultId = 3;
                        arr.push(match);
                    }
                }
            }
        }
        if (arr.length > 0) {
            let data = await this.matchService.batchCreateOrUpdate(arr);
            if (data) {
                for (let match of data) {
                    //this.sendMatchEvent(match);
                }
            }
        }
        return response.status(200).send({success: true});
    }
    
    @Authorized()
    @Post('/bulk/time')
    async bulkMatchPushBack(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('startTimeStart', { required: true }) startTimeStart: Date,
        @QueryParam('startTimeEnd', { required: true }) startTimeEnd: Date,
        @QueryParam('type') type: string,
        @QueryParam('hours') hours: number,
        @QueryParam('minutes') minutes: number,
        @QueryParam('seconds') seconds: number,
        @QueryParam('newDate') newDate: Date,
        @Res() response: Response

    ) {

        let matchesData = await this.matchService.findByDate(new Date(startTimeStart), new Date(startTimeEnd))
        let arr = [];
        if (newDate) {
            for (let match of matchesData) {
                match.startTime = new Date(newDate);
                arr.push(match);
            }

        } else {
            
            if (type == 'backward') {
                for (let match of matchesData) {
                    let myDate = new Date(match.startTime);
                    if (hours) {
                        myDate.setHours(myDate.getHours() + hours);
                    }
                    if (minutes) {
                        myDate.setMinutes(myDate.getMinutes() + minutes);
                    }
                    if (seconds) {
                        myDate.setSeconds(myDate.getSeconds() + seconds);
                    }
                    match.startTime = new Date(myDate);
                    arr.push(match)
                }
            } else if (type == 'forward') {
                for (let match of matchesData) {
                    const myDate = new Date(match.startTime);
                    if (hours) {
                        myDate.setHours(myDate.getHours() - hours);
                    }
                    if (minutes) {
                        myDate.setHours(myDate.getMinutes() - minutes);
                    }
                    if (seconds) {
                        myDate.setHours(myDate.getSeconds() - seconds);
                    }
                    match.startTime = new Date(myDate);
                    arr.push(match)
                }
            }
        }
        if (arr.length > 0) {
            let data = await this.matchService.batchCreateOrUpdate(arr);
            if (data) {
                for (let match of data) {
                   // this.sendMatchEvent(match);
                }
            }
        }
        return response.status(200).send({success: true});
    }
    
    @Authorized()
    @Post('/bulk/doubleheader')
    async doubleHeader(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('round1', { required: true }) round1: string,
        @QueryParam('round2', { required: true }) round2: string,
        @Res() response: Response

    ) {

        let firstRoundArray = await this.roundService.findByName(competitionId, round1);
        let secondRoundArray = await this.roundService.findByName(competitionId, round2);
        for (let r1 of firstRoundArray) {
            for (let r2 of secondRoundArray) {
                if (r2.divisionId = r1.divisionId) {
                    let firstMatchesArray = await this.matchService.findByRound(r1.id);
                    let secondMatchesArray = await this.matchService.findByRound(r2.id);
                    let secondMatchTemplate = secondMatchesArray[1];
                    if (secondMatchTemplate.startTime) {

                        for (let m1 of firstMatchesArray) {
                            m1.startTime = secondMatchTemplate.startTime;
                            m1.type = 'TWO_HALVES';
                            m1.matchDuration = m1.matchDuration / 2;
                            let match = await this.matchService.createOrUpdate(m1);
                            if (match) {
                                this.sendMatchEvent(match);
                            }
                        }
                    }

                    for (let m2 of secondMatchesArray) {
                        let secondMatchOffset = m2.matchDuration / 2 + m2.breakDuration + m2.mainBreakDuration;
                        m2.type = 'TWO_HALVES';
                        m2.matchDuration = m2.matchDuration / 2;
                        let match = await this.matchService.createOrUpdate(m2);
                        if (match) {
                            this.sendMatchEvent(match);
                        }
                    }
                }
            }
        }
        return response.status(200).send({ success: true });
    }

    @Authorized()
    @Post('/import')
    async importMatch(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @UploadedFile("file", { required: true }) file: Express.Multer.File,
        @Res() response: Response
    ) {

        let bufferString = file.buffer.toString('utf8');
        let arr = bufferString.split('\n');
        var jsonObj = [];
        var headers = arr[0].split(',');
        for (var i = 1; i < arr.length; i++) {
            var data = arr[i].split(',');
            var obj = {};
            for (var j = 0; j < data.length; j++) {
                obj[headers[j].trim()] = data[j].trim();
            }
            jsonObj.push(obj);
        }

        JSON.stringify(jsonObj);
        let queryArr = [];
        for (let i of jsonObj) {
            if (i.Date !== "") {
                var dateArray = i.Date.split(".");
                var str = i.Time;
                let isPM = str.includes("P");
                if (isPM) {
                    var array = str.split("P");
                    var timeArray = array[0].split(":");
                    var timeZoneArray = i["Timezone GMT"].split(":");
                    if (timeZoneArray.length > 1) {

                        var hr = parseInt(timeArray[0]) + 12 + parseInt(timeZoneArray[0]);

                        if (timeZoneArray[0].startsWith("-")) {
                            var min = parseInt(timeArray[1]) - parseInt(timeZoneArray[1]);
                        } else {
                            var min = parseInt(timeArray[1]) + parseInt(timeZoneArray[1]);
                        }

                        if (min >= 60) {
                            min -= 60
                            hr++;
                        } else if (min < 0) {
                            min += 60
                            hr--;
                        }

                        if (hr > 24) {
                            hr -= 24;
                            dateArray[0]++;
                        } else if (hr < 0) {
                            hr += 24;
                            dateArray[0]--;
                        }

                    } else {

                        var hr = parseInt(timeArray[0]) + 12 + parseInt(timeZoneArray[0]);
                        var min = parseInt(timeArray[1]);

                        if (hr > 24) {
                            hr -= 24;
                            dateArray[0]++;
                        }
                    }

                } else {
                    var array = str.split("A");
                    var timeArray = array[0].split(":");
                    var timeZoneArray = i["Timezone GMT"].split(":");
                    if (timeZoneArray.length > 1) {

                        var hr = parseInt(timeArray[0]) + parseInt(timeZoneArray[0]);

                        if (timeZoneArray[0].startsWith("-")) {
                            var min = parseInt(timeArray[1]) - parseInt(timeZoneArray[1]);
                        } else {
                            var min = parseInt(timeArray[1]) + parseInt(timeZoneArray[1]);
                        }

                        if (min >= 60) {
                            min -= 60
                            hr++;
                        } else if (min < 0) {
                            min += 60
                            hr--;
                        }

                    } else {

                        var hr = parseInt(timeArray[0]) + parseInt(timeZoneArray[0]);

                        if (timeZoneArray[0].startsWith("-")) {
                            var min = parseInt(timeArray[1]);
                        } else {
                            var min = parseInt(timeArray[1]);
                        }
                    }

                }

                if (min >= 60) {
                    min -= 60
                    hr++;
                } else if (min < 0) {
                    min += 60
                    hr--;
                }

                if (hr > 24) {
                    hr -= 24;
                    dateArray[0]++;
                } else if (hr < 0) {
                    hr += 24;
                    dateArray[0]--;
                }

                let stringHr = hr + '';
                if (hr >= 0 && hr <= 9) {
                    stringHr = '0' + hr
                }

                let stringMin = min + '';
                if (min >= 0 && min <= 9) {
                    stringMin = '0' + min
                }

                let timeZone = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}T${stringHr}:${stringMin}`;
                let a = new Date(timeZone);
                let divisionData = await this.divisionService.findByName(i["Grade"], competitionId);
                let team1Data = await this.teamService.findByNameAndCompetition(i["Home Team"], competitionId);
                let team2Data = await this.teamService.findByNameAndCompetition(i["Away Team"], competitionId);
                let venueData = await this.competitionVenueService.findByCourtName(i["Venue"], competitionId);
                let roundData;
                if (divisionData && divisionData[0] != null) {
                    let rounds = await this.roundService.findByName(competitionId, i["Round"], divisionData[0].id);
                    roundData = rounds[0];
                } else {
                    return response.status(400).send({
                        name: 'validation_error',
                        message: `Issue uploading matches, The divisions entered is not associated with this competition`
                    });
                }

                if (!roundData) {
                    let round = new Round();
                    let value = stringTONumber(i["Round"].split(" ")[1]);
                    round.competitionId = competitionId;
                    if (divisionData && divisionData[0] != null) {
                        round.divisionId = divisionData[0].id;
                    }
                    round.name = i.Round;
                    round.sequence = value;
                    roundData = await this.roundService.createOrUpdate(round);
                }

                let match = new Match();
                match.startTime = a;
                match.competitionId = competitionId;
                match.type = i.type;
                match.matchDuration = i.matchDuration;
                match.breakDuration = i.breakDuration;
                match.mainBreakDuration = i.mainBreakDuration;
                match.mnbMatchId = i.mnbMatchId;
                match.roundId = roundData.id;
                if (venueData && venueData[0] != null) {
                    match.venueCourtId = venueData[0].id;
                }
                match.team1Score = 0;
                match.team2Score = 0;

                if (divisionData.length > 0)
                    match.divisionId = divisionData[0].id;
                if (team1Data.length > 0)
                    match.team1Id = team1Data[0].id; //team1Data is an array
                if (team2Data.length > 0)
                    match.team2Id = team2Data[0].id; //team2Data is an array
                queryArr.push(match);
            }
        }

        await this.matchService.batchCreateOrUpdate(queryArr);
        return response.status(200).send({ success: true });

    }
}
