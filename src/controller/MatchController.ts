import {Response} from "express";
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
    UploadedFile,
    Delete
} from "routing-controllers";
import * as _ from "lodash";
import * as fastcsv from "fast-csv";

import {
    contain,
    stringTONumber,
    paginationData,
    isArrayPopulated,
    isNotNullAndUndefined,
    validationForField,
    parseDateTimeZoneString,
    arrangeCSVToJson,
    trim
} from "../utils/Utils";
import {BaseController} from "./BaseController";
import {logger} from "../logger";
import {User} from "../models/User";
import {Match} from "../models/Match";
import {MatchScores} from "../models/MatchScores";
import {MatchUmpire} from "../models/MatchUmpire";
import {Lineup} from "../models/Lineup";
import {Round} from "../models/Round";
import {RequestFilter} from "../models/RequestFilter";
import {Roster} from "../models/security/Roster";
import {Role} from "../models/security/Role";
import {GamePosition} from "../models/GamePosition";
import {Competition} from '../models/Competition';

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
        @HeaderParam("authorization") user: User
    ) {
        let match = await this.matchService.findById(id);
        let deletedMatch = await this.matchService.softDelete(id, user.id);
        this.sendMatchEvent(match, false, {user: user, subtype: 'match_removed'});
        return deletedMatch;
    }

    @Authorized()
    @Get('/admin/:id')
    async getAdmin(
        @Param("id") id: number,
        @QueryParam('lineups') lineups: number = 0,
    ) {
        const matchDetails = await this.matchService.findAdminMatchById(id, lineups);
        if (matchDetails && matchDetails.match[0]) {
            const competitionId = matchDetails.match[0].competitionId;
            const competition = await this.competitionService.findById(competitionId);
            const organisationId = competition.organisationId;
            const competitionOrganisation = await this.organisationService.findById(organisationId);

            return {
                ...matchDetails,
                competitionOrganisation,
            }
        }
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
        @QueryParam('divisionIds') divisionIds: number[],
        @QueryParam('organisationIds') organisationIds: number[],
        @QueryParam('matchEnded') matchEnded: boolean,
        @QueryParam('matchStatus') matchStatus: ("STARTED" | "PAUSED" | "ENDED")[],
        @QueryParam('roundName') roundName: string,
        @QueryParam('search') search: string,
        @QueryParam('offset') offset: number = undefined,
        @QueryParam('limit') limit: number = undefined,
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC" | "DESC" = undefined
    ): Promise<any> {
        // Add all teams of supplied players.
        if (playerIds) {
            teamIds = _.uniq([
                ...teamIds,
                ...(await this.playerService.findByIds(playerIds)).map(player => player.teamId)
            ]);
        }
        if (isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit)) {
            offset = stringTONumber(offset);
            limit = stringTONumber(limit);
        }

        if (search === null || search === undefined) search = '';

        const matchFound = await this.matchService.findByParam(from, to, teamIds, playerIds, competitionId, divisionIds, organisationIds, matchEnded, matchStatus, roundName, search, offset, limit, sortBy, sortOrder);

        if (isNotNullAndUndefined(matchFound.matchCount) && isNotNullAndUndefined(matchFound.result) && limit) {
            let responseObject = paginationData(stringTONumber(matchFound.matchCount), limit, offset)
            responseObject["matches"] = matchFound.result;
            return responseObject;
        } else {
            return matchFound.result;
        }
    }

    @Get('/home')
    async loadHomeMatches(
        @QueryParam('organisationIds') organisationIds: number[],
        @QueryParam('teamIds') teamIds: number[] = [],
        @QueryParam('playerIds') playerIds: number[],
        @QueryParam('upcomingCount') upcomingCount: number,
        @QueryParam('upcomingStartTimeRange') upcomingStartTimeRange: number = undefined,
        @QueryParam('endTimeRange') endTimeRange: number
    ): Promise<{ live: Match[], upcoming: Match[], ended: Match[] }> {
        if (organisationIds && !Array.isArray(organisationIds)) organisationIds = [organisationIds];
        if (teamIds && !Array.isArray(teamIds)) teamIds = [teamIds];
        if (playerIds && !Array.isArray(playerIds)) playerIds = [playerIds];
        if ((playerIds && playerIds.length > 0) || (organisationIds && organisationIds.length > 0) || (teamIds && teamIds.length > 0)) {
            if (playerIds && playerIds.length > 0) {
                teamIds = _.uniq([
                    ...teamIds,
                    ...(await this.playerService.findByIds(playerIds)).map(player => player.teamId)
                ]);
            }
            const live = await this.matchService.loadHomeLive(organisationIds, teamIds);
            let upcoming = await this.matchService.loadHomeUpcoming(organisationIds, teamIds, upcomingStartTimeRange);
            if (upcomingCount != undefined && upcomingCount != 0) {
                let teams = teamIds;
                if (organisationIds && organisationIds.length > 0) {
                    teams = _.uniq([
                        ...teamIds,
                        ...(await this.teamService.teamIdsByOrganisationIds(organisationIds)).map(data => data['id'])
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
            const ended = endTimeRange ? await this.matchService.loadHomeEnded(organisationIds, teamIds, endTimeRange) : [];
            return { live, upcoming, ended };
        } else {
            return { live: [], upcoming: [], ended: [] };
        }
    }

    @Post('/admin')
    async admin(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('teamId') teamId: number,
        @QueryParam('roleId') roleId: number,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response
    ): Promise<any> {
        // Add all teams of supplied players.
        if (competitionId && requestFilter) {
            if (!roleId) {
                roleId = 4; // TODO - remove once front end is caught up
            }
            return this.matchService.loadAdmin(competitionId, teamId, roleId, requestFilter);
        } else {
            return response.status(200).send({
                name: 'search_error',
                message: `Required fields are missing`
            });
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
            return response.status(200).send({
                name: 'search_error',
                message: `Required fields are missing`
            });
        }
    }

    @Authorized()
    @Get('/competition')
    async byCompetition(
        @QueryParam('id', { required: true }) id: number,
        @QueryParam('start') start: Date,
        @QueryParam('end') end: Date,
        @Res() response: Response
    ) {
        if (!start && !end) {
            return response.status(400).send({
                name: 'param_error',
                message: 'Start or end must be filled'
            });
        }

        const live = await this.matchService.loadCompetitionAndDate(id, start, end, true);
        const upcoming = await this.matchService.loadCompetitionAndDate(id, start, end, false);
        return { live: live, upcoming: upcoming };
    }

    @Authorized()
    @Post('/')
    async create(
        @HeaderParam("authorization") user: User,
        @QueryParam('userId') userId: number = null,
        @Body() match: Match,
        @Res() response: Response
    ) {
        try{
           // logger.debug(`Inside the Create Match::` + JSON.stringify(match));
            let isNewMatch = false;
            let nonSilentNotify = false;
            if (match.id == 0) {
                isNewMatch = true;
            } else {
                let dbMatch = await this.matchService.findById(match.id);
                if ((dbMatch.divisionId != match.divisionId ||
                    dbMatch.type != match.type ||
                    dbMatch.team1Id != match.team1Id ||
                    dbMatch.team2Id != match.team2Id ||
                    dbMatch.venueCourtId != match.venueCourtId ||
                    dbMatch.roundId != match.roundId ||
                    dbMatch.matchDuration != match.matchDuration ||
                    dbMatch.breakDuration != match.breakDuration ||
                    dbMatch.mainBreakDuration != match.mainBreakDuration ||
                    dbMatch.matchStatus != match.matchStatus ||
                    dbMatch.team1ResultId != match.team1ResultId ||
                    dbMatch.team2ResultId != match.team2ResultId ||
                    dbMatch.resultStatus != match.resultStatus ||
                    dbMatch.startTime != match.startTime) &&
                    (new Date(match.startTime) > new Date())
                ) {
                    nonSilentNotify = true;
                }
            }

            // Saving match scores if match id and userId are present
            if (userId && match.id && !isNewMatch) {
                const matchScores = new MatchScores();
                matchScores.userId = userId;
                matchScores.matchId = match.id;
                matchScores.team1Score = match.team1Score;
                matchScores.team2Score = match.team2Score;

                this.matchScorerService.createOrUpdate(matchScores);
            }

            // Saving match
            const saved = await this.matchService.createOrUpdate(match);
            if (isNewMatch) {
                match.id = saved.id;
            }

            // Getting match competition and rosters existing for the match
            const competition = await this.competitionService.findById(match.competitionId);
          //  logger.debug(`competition::` + JSON.stringify(competition));

            // Updating umpires
            if (competition.recordUmpireType == "NAMES") {

                let oldUmpires = await this.matchUmpireService.findByMatchIds([match.id]);
                let newUmpires = match.matchUmpires;
                // logger.debug(`newUmpires::` + JSON.stringify(newUmpires));
                // logger.debug(`oldUmpires::` + JSON.stringify(oldUmpires));
                if (newUmpires) {
                    if (oldUmpires) {
                        const matchUmpireDeletePromises = [];
                        /// Checking if any of the old umpires sequences are not present in new data
                        for (let oldUmpire of oldUmpires) {
                            /// If there is no new umpire with that sequence that delete old one.
                            if (newUmpires.filter(umpire => (umpire.umpireName && umpire.sequence == oldUmpire.sequence)).length == 0) {
                                matchUmpireDeletePromises.push(
                                    this.matchUmpireService.deleteById(oldUmpire.id)
                                );
                            }
                        }
                        await Promise.all(matchUmpireDeletePromises);
                    }

                    /// Updating umpires data
                    for (let newUmpire of newUmpires) {
                        if (newUmpire.umpireName) {
                            newUmpire.matchId = saved.id;
                            let oldMatchingUmpireList = [];
                            if (oldUmpires) {
                                oldMatchingUmpireList = oldUmpires.filter(umpire => umpire.sequence == newUmpire.sequence);
                            }
                            if (oldMatchingUmpireList.length > 0) {
                                let oldUmpire = oldMatchingUmpireList[0];
                                if (oldUmpire.organisationId != newUmpire.organisationId ||
                                    oldUmpire.umpireName != newUmpire.umpireName ||
                                    oldUmpire.umpireType != newUmpire.umpireType) {
                                    this.createUmpire(newUmpire, user.id, oldUmpire);
                                }
                            } else {
                                this.createUmpire(newUmpire, user.id);
                            }
                        }
                    }
                }
            }
          //  logger.debug(` Before oldRosters::` + match.id);
            /// Getting all old scorer or umpire rosters
            let oldRosters = (await this.rosterService
                .findAllRostersByParam([match.id]))
                .filter(roster =>
                    (roster.roleId == Role.SCORER ||
                      roster.roleId == Role.UMPIRE ||
                      roster.roleId == Role.UMPIRE_RESERVE ||
                      roster.roleId == Role.UMPIRE_COACH)
                );
                // logger.debug(` After oldRosters::` + JSON.stringify(oldRosters));
                // logger.debug(` Mach Rosters::` + JSON.stringify(match.rosters));
            if (isArrayPopulated(match.rosters)) {
                let newRosters = match.rosters;
                /// Deleting rosters which doesn't match with new one's provided
                const deleteRosterPromises = [];
                for (let oldRoster of oldRosters) {
                    // delete old roster only if it doesn't match new role, user, team
                    let matchedNewRosters = newRosters.filter(
                        roster =>
                            (roster.userId &&
                                oldRoster.roleId == roster.roleId &&
                                oldRoster.userId == roster.userId &&
                                oldRoster.teamId == roster.teamId)
                    );
                    if (matchedNewRosters.length == 0) {
                        deleteRosterPromises.push(
                            this.deleteRoster(oldRoster)
                        );
                    }
                }
                await Promise.all(deleteRosterPromises);

                let umpireSequence = 0;
               // logger.debug("Match Create Rosters" + JSON.stringify(match.rosters));
                for (let newRoster of match.rosters) {
                    newRoster.matchId = saved.id;
                    if (newRoster.roleId == Role.UMPIRE) {
                        // Increment the umpire sequence if the roster role is umpire
                        ++umpireSequence;
                    }
                    if (newRoster.roleId == Role.UMPIRE && competition.recordUmpireType == "USERS") {
                        this.addUmpireTypeRoster(
                            match.id,
                            Role.UMPIRE,
                            oldRosters,
                            newRoster,
                            umpireSequence
                        );
                    } else if (newRoster.roleId == Role.SCORER) {
                        // add new umpire roster only if it doesn't match old role, user, team
                        let matchedOldRosters = oldRosters.filter(
                            roster =>
                                (roster.roleId == Role.SCORER &&
                                    roster.userId &&
                                    roster.userId == newRoster.userId &&
                                    roster.teamId == newRoster.teamId)
                        );
                        if (matchedOldRosters.length == 0 && newRoster.userId) {
                            this.addScorerRoster(newRoster, user);
                        }
                    } else if (newRoster.roleId == Role.UMPIRE_RESERVE) {
                        this.addUmpireTypeRoster(
                            match.id,
                            Role.UMPIRE_RESERVE,
                            oldRosters,
                            newRoster
                        );
                    } else if (newRoster.roleId == Role.UMPIRE_COACH) {
                        this.addUmpireTypeRoster(
                            match.id,
                            Role.UMPIRE_COACH,
                            oldRosters,
                            newRoster
                        );
                    }
                }
            } else if (oldRosters.length > 0) {
                /// As there are no rosters provided with match we will remove
                /// all existing rosters.
                const deleteRosterPromises = [];
                for (let roster of oldRosters) {
                    deleteRosterPromises.push(
                        this.deleteRoster(roster)
                    );
                }
                await Promise.all(deleteRosterPromises);
            }

            // Team Ladder
            // if (!isNewMatch) {
            let arr = [];
            arr.push(match);
            await this.performTeamLadderOperation(arr, user.id);

            this.sendMatchEvent(
                saved,
                false,
                { nonSilentNotify: nonSilentNotify }
            ); // This is to send notification for devices
            return saved;
        }
        catch(error){
            logger.error(`Exception occurred in create Match ${error}`);
        }

    }

    private async addUmpireTypeRoster(
        matchId: number,
        roleId: number,
        oldRosters: Roster[],
        newRoster: Roster,
        umpireSequence: number = undefined
    ) {
      // add new umpire or umpire reserve or umpire coach only if it doesn't match old role, user
      let matchedOldRosters = oldRosters.filter(
          roster =>
              (roster.roleId == roleId &&
                  roster.userId &&
                  roster.userId == newRoster.userId)
      );
      if (matchedOldRosters.length == 0 && newRoster.userId) {
          let user = await this.userService.findById(newRoster.userId);
          this.umpireAddRoster(
              roleId,
              matchId,
              newRoster.userId,
              `${user.firstName} ${user.lastName}`,
              false
          );

          /// If umpire role then create match umpire
          if (roleId == Role.UMPIRE && umpireSequence) {
              this.createMatchUmpireFromRoster(newRoster, user.id, umpireSequence);
          }
      }
    }

    private async createUmpire(umpire: MatchUmpire, createdBy: number, existingUmpire: MatchUmpire = null) {
        var newMatchUmpire = new MatchUmpire();

        if (existingUmpire) {
            newMatchUmpire.id = existingUmpire.id;
        }
        newMatchUmpire.matchId = umpire.matchId;
        newMatchUmpire.userId = umpire.userId;
        newMatchUmpire.organisationId = umpire.organisationId;
        newMatchUmpire.umpireName = umpire.umpireName;
        newMatchUmpire.umpireType = umpire.umpireType;
        newMatchUmpire.sequence = umpire.sequence;
        newMatchUmpire.verifiedBy = umpire.verifiedBy;
        newMatchUmpire.createdBy = createdBy;

        await this.matchUmpireService.createOrUpdate(newMatchUmpire);
    }

    private async createMatchUmpireFromRoster(roster: Roster, createdBy: number, sequence: number) {
        if (roster.userId) {
            let umpireUser = await this.userService.findById(roster.userId);
            var newMatchUmpire = new MatchUmpire();

            newMatchUmpire.matchId = roster.matchId;
            newMatchUmpire.userId = roster.userId;
            newMatchUmpire.umpireName = `${umpireUser.firstName} ${umpireUser.lastName}`;
            newMatchUmpire.umpireType = "USERS";
            newMatchUmpire.sequence = sequence;
            newMatchUmpire.createdBy = createdBy;

            await this.matchUmpireService.createOrUpdate(newMatchUmpire);
        }
    }

    private async deleteRoster(roster: Roster) {
       // logger.debug(`Inside the deleteRoster` + JSON.stringify(roster));
        try {
            if (roster.roleId == Role.SCORER) {
                await this.removeScorerRoster(roster.matchId, roster);
            } else if (roster.roleId == Role.UMPIRE_RESERVE) {
                if (roster.userId) {
                    await this.umpireRemoveRoster(
                        Role.UMPIRE_RESERVE,
                        roster.userId,
                        roster.matchId
                    );
                }
            } else if (roster.roleId == Role.UMPIRE_COACH) {
                if (roster.userId) {
                    await this.umpireRemoveRoster(
                        Role.UMPIRE_COACH,
                        roster.userId,
                        roster.matchId
                    );
                }
            } else {
                if (roster.userId) {
                    /// For users umpire type need to delete matchUmpire data as well
                    this.matchUmpireService.deleteByParms(
                        roster.matchId,
                        roster.userId
                    );

                    await this.umpireRemoveRoster(
                        Role.UMPIRE,
                        roster.userId,
                        roster.matchId
                    );
                }
            }
        } catch (error) {
            logger.error(`Exception occurred in deleteRoster ${error}` );
        }
    }

    private async removeScorerRoster(matchId: number, roster: Roster) {
        try{
           // logger.debug(`Inside the removeScorerRoster ` + JSON.stringify(roster) + "&&" + matchId);
            let tokens = (await this.deviceService.findScorerDeviceFromRoster(matchId, roster.id)).map(device => device.deviceId);
            let rosterId = roster.id ? roster.id.toString() : "";
            let mtchId = roster.matchId ? roster.matchId.toString(): "";
            let result = await this.rosterService.delete(roster);
            if (result) {
                if (tokens && tokens.length > 0) {
                    this.firebaseService.sendMessageChunked({
                        tokens: tokens,
                        data: {
                            type: 'remove_scorer_match',
                            rosterId: rosterId,
                            matchId: mtchId
                        }
                    })
                }
            }
        }
        catch(error){
            logger.error(`Exception occurred in removeScorerRoster ${error}`);
        }

    }

    private async addScorerRoster(roster: Roster, user: User) {
        let nr = new Roster();
        nr.roleId = roster.roleId;
        nr.userId = roster.userId;
        nr.teamId = roster.teamId;
        nr.matchId = roster.matchId;
        let savedRoster = await this.rosterService.createOrUpdate(nr);

        if (savedRoster) {
            await this.notifyRosterChange(user, savedRoster, "Scoring");
        }
    }

    @Authorized()
    @Post('/periodScores')
    async addMatchScores(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId') matchId: number,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('startedMsFromStart') startedMsFromStart: number,
        @Body() scores: MatchScores,
        @Res() response: Response
    ) {
        if (scores) {
            const result = await this.matchScorerService.findByMatchIdAndPeriod(
                scores.matchId,
                scores.period
            );
            const match = await this.matchService.findById(matchId);
            let saved: MatchScores;
            if (result) {
                scores.id = result.id;
                saved = await this.matchScorerService.createOrUpdate(scores);
            } else {
                if (scores.id) scores.id = null;
                saved = await this.matchScorerService.createOrUpdate(scores);
            }

            /// On period scores call if the match team scores are not matching
            /// then we will update the match team scores as per the data from
            /// Scores and send a match notification for update score.
            if (match &&
                (match.team1Score != scores.team1Score ||
                  match.team2Score != scores.team2Score)
            ) {
                match.team1Score = scores.team1Score;
                match.team2Score = scores.team2Score;
                await this.matchService.createOrUpdate(match);
                this.sendMatchEvent(match, true, {user: user});
            }

            // return
            if (saved) {
                // log match event
                let eventTimestamp;
                if (startedMsFromStart != undefined) {
                    eventTimestamp = new Date(match.startTime.getTime() + startedMsFromStart);
                } else {
                    const periodDuration = match.matchDuration / (match.type == 'FOUR_QUARTERS' ? 4 : 2);
                    eventTimestamp = startedMsFromStart
                        ? new Date(match.startTime.getTime() + startedMsFromStart)
                        : new Date(Date.now() - periodDuration * 1000);
                }
                this.matchService.logMatchEvent(matchId, 'timer', 'periodStart', saved.period, eventTimestamp, user.id);

                eventTimestamp = msFromStart ? new Date(match.startTime.getTime() + msFromStart) : Date.now();
                this.matchService.logMatchEvent(matchId, 'timer', 'periodEnd', saved.period, eventTimestamp, user.id);
                return response.status(200).send({ updated: true });
            } else {
                return response.status(412).send({
                    name: 'save_error',
                    message: 'Undefined error'
                });
            }
        } else {
            return response.status(400).send({
                name: 'bad_request',
                message: 'Match scores can`t bbe null'
            });
        }
    }

    @Authorized()
    @Patch('/updateScore')
    async updateScore(
        @HeaderParam("authorization") user: User,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('matchId', { required: true }) matchId: number,
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
        this.sendMatchEvent(match, true, {user: user});

        let eventTimestamp = msFromStart
            ? new Date(match.startTime.getTime() + msFromStart)
            : new Date(Date.now());
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
        @QueryParam('matchId', { required: true }) matchId: number,
        @QueryParam('periodNumber') periodNumber: number,
        @QueryParam('teamSequence') teamSequence: number,
        @QueryParam('positionId') positionId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('gameStatCode') gameStatCode: string,
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);

        let eventTimestamp = msFromStart
            ? new Date(match.startTime.getTime() + msFromStart)
            : new Date(Date.now());
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
        @QueryParam('matchId', { required: true }) matchId: number,
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
            return response.status(400).send({
                name: 'search_error',
                message: `Match with id ${matchId} not found`
            });
        }
        this.sendMatchEvent(match, false, {user: user});
        await this.matchService.logLiteMatchEvent(matchId, 'timer', 'start', 1, match.startTime, user.id);
        return match;
    }

    @Authorized()
    @Post('/restart')
    async restartMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', { required: true }) matchId: number,
        @QueryParam('timeInMilliseconds') timeInMilliseconds: number,
        @QueryParam('clearAttendance') clearAttendance: boolean,
        @Res() response: Response
    ) {
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
            return response.status(400).send({
                name: 'search_error',
                message: `Match with id ${matchId} not found`
            });
        }
        this.sendMatchEvent(match, false, {user: user});
        await this.matchService.logLiteMatchEvent(matchId, 'timer', 'start', 1, match.startTime, user.id);
        return response.status(200).send({ restarted: true });
    }

    @Authorized()
    @Post('/pause')
    async pauseMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', { required: true }) matchId: number,
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
            return response.status(400).send({
                name: 'search_error',
                message: `Match with id ${matchId} not found`
            });
        }
        this.sendMatchEvent(match, false, {user: user});

        let eventTimestamp = msFromStart ? new Date(match.startTime.getTime() + msFromStart) : new Date(Date.now());
        this.matchService.logMatchEvent(matchId, 'timer', 'pause', period, eventTimestamp,
            user.id, 'isBreak', isBreak ? "true" : "false");
        return match;
    }

    @Authorized()
    @Post('/resume')
    async resumeMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', { required: true }) matchId: number,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('pausedMs') pausedMs: number,
        @QueryParam('isBreak') isBreak: boolean,
        @QueryParam('period') period: number,
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            let totalPausedTime = pausedMs;
            if (!totalPausedTime) {
                let millisecondsFromStart = msFromStart ? msFromStart : 0;
                let millisecond = match.pauseStartTime ? match.pauseStartTime.getTime() - match.startTime.getTime() : 0;
                totalPausedTime = millisecondsFromStart - (millisecond);
            }
            match.totalPausedMs = match.totalPausedMs + totalPausedTime;
            match.matchStatus = "STARTED";
            let savedMatch = await this.matchService.createOrUpdate(match);

            await this.matchService.logMatchPauseTime(
                matchId,
                period,
                isBreak,
                totalPausedTime
            );

            this.sendMatchEvent(match, false, {user: user});
            let eventTimestamp = msFromStart ? new Date(match.startTime.getTime() + msFromStart) : new Date(Date.now());
            this.matchService.logMatchEvent(matchId, 'timer', 'resume', period, eventTimestamp,
                user.id, 'isBreak', isBreak ? "true" : "false");
            return savedMatch;
        } else {
            return response.status(400).send({
                name: 'search_error',
                message: `Match with id ${matchId} not found`
            });
        }
    }

    @Authorized()
    @Post('/changeScorer')
    async changeScorer(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', { required: true }) matchId: number,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('period') period: number,
        @QueryParam('scorerStatus', { required: true }) scorerStatus: "SCORER1" | "SCORER2",
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            match.scorerStatus = scorerStatus;
            await this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send({
                name: 'search_error',
                message: `Match with id ${matchId} not found`
            });
        }
        this.sendMatchEvent(match, false, {user: user, subtype: "scorer_changed"});
        let eventTimestamp = msFromStart ? new Date(match.startTime.getTime() + msFromStart) : new Date(Date.now());
        this.matchService.logMatchEvent(matchId, 'scorer', 'changed', period, eventTimestamp, user.id, 'scorerStatus', scorerStatus.toString());
        return match;
    }

    @Authorized()
    @Post('/end')
    async endMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('msFromStart') msFromStart: number,
        @QueryParam('startedMsFromStart') startedMsFromStart: number,
        @QueryParam('isExtraTime') isExtraTime: boolean,
        @BodyParam("match", { required: true }) match: Match,
        @BodyParam("score", { required: true }) scores: MatchScores,
        @Res() response: Response
    ) {
        if (match) {
            const result = await this.matchScorerService.findByMatchIdAndPeriod(
                scores.matchId,
                scores.period
            );
            scores.id = result ? result.id : null;
            this.matchScorerService.createOrUpdate(scores);

            let endTime = Date.now();
            match.endTime = new Date(endTime);
            match.matchStatus = "ENDED";
            this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send({
                name: 'search_error',
                message: `Match can not be empty`
            });
        }

        // Team Ladder
        let arr = [];
        arr.push(match);
        await this.performTeamLadderOperation(arr, user.id);

        this.sendMatchEvent(match, false, {user: user});

        // log match event
        let eventTimestamp;
        let time = new Date(match.startTime);
        if (startedMsFromStart) {
            eventTimestamp = new Date(time.getTime() + startedMsFromStart);
        } else {
            const periodDuration = match.matchDuration / (match.type == 'FOUR_QUARTERS' ? 4 : 2);
            eventTimestamp = startedMsFromStart
                ? new Date(time.getTime() + startedMsFromStart)
                : Date.now() - periodDuration * 1000;
        }
        await this.matchService.logMatchEvent(match.id, 'timer', 'periodStart', scores.period, eventTimestamp, user.id);

        eventTimestamp = msFromStart ? new Date(time.getTime() + msFromStart) : Date.now();
        this.matchService.logMatchEvent(match.id, 'timer', 'periodEnd', scores.period, eventTimestamp, user.id);

        return match;
    }

    @Post('/broadcast')
    async broadcastMatch(
        @QueryParam('matchId', { required: true }) matchId: number,
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            this.sendMatchEvent(match);
        }
        return match;
    }

    async sendMatchEvent(
        match: Match,
        updateScore: boolean = false,
        optionals?: { user?: User, subtype?: string, nonSilentNotify?: boolean }
    ) {
        try {
            if (match) {
                var messageBody: string = undefined;
                if (optionals &&
                    (optionals.nonSilentNotify != null || optionals.nonSilentNotify != undefined) &&
                    optionals.nonSilentNotify == true) {
                        messageBody = 'A change has been made to your match. Please check match details.';
                }
                const dataDict = {};
                dataDict["type"] = "match_updated";
                dataDict["matchId"] = match.id.toString();
                if (optionals && optionals.user) {
                    dataDict["userId"] = optionals.user.id.toString();
                }
                if (optionals && optionals.subtype) {
                    dataDict["subtype"] = optionals.subtype;
                    if (optionals.subtype == 'match_livestreamURL_updated') {
                      dataDict["livestreamURL"] = match.livestreamURL;
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

                // Getting tokens by match
                let userDevices = await this.deviceService.findDeviceByMatch(match);
                let userDeviceTokens = (userDevices).map(device => device.deviceId);
                // Getting tokens by watchlist
                let list = await this.watchlistService.loadByParam(match.id, [match.team1Id, match.team2Id]);
                let watchlistTokens = (list).map(wl => wl['token']);
                // tokens
                let tokens = [];
                Array.prototype.push.apply(tokens, userDeviceTokens);
                Array.prototype.push.apply(tokens, watchlistTokens);


                logger.debug('Load device tokens', tokens);
                if (tokens && tokens.length > 0) {
                    logger.debug('Prepare data for update match message', dataDict);
                    let uniqTokens = new Set(tokens);
                    this.firebaseService.sendMessageChunked({
                      body: messageBody,
                      tokens: Array.from(uniqTokens),
                      data: dataDict
                    })
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
        @QueryParam('matchId', { required: true }) matchId: number,
        @QueryParam('centrePassStatus', { required: true }) centrePassStatus: "TEAM1" | "TEAM2",
        @QueryParam('centrePassWonBy') centrePassWonBy: "TEAM1" | "TEAM2",
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            match.centrePassStatus = centrePassStatus;
            if (centrePassWonBy) {
                match.centrePassWonBy = centrePassWonBy;
            }
            this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send({
                name: 'search_error',
                message: `Match with id ${matchId} not found`
            });
        }
        this.sendMatchEvent(match, false, {user: user, subtype: "centre_pass_changed"});
        return match;
    }

    @Authorized()
    @Post('/lineup')
    async saveLineup(
        @QueryParam('teamId') teamId: number = undefined,
        @QueryParam('matchId') matchId: number = undefined,
        @QueryParam('updateMatchEvents') updateMatchEvents: boolean,
        @BodyParam("lineups", { required: true }) lineups: Lineup[],
        @Res() response: Response
    ) {
        try {
            if (lineups) {
                if (teamId && matchId) {
                    await this.matchService.deleteLineups(matchId, teamId);
                } else if ((!teamId && matchId) || (teamId && !matchId)) {
                    return response.status(400).send({
                        name: 'validation_error',
                        message: `Match Id and team Id can not be null`
                    });
                }

                await this.matchService.batchSaveLineups(lineups);
                if (updateMatchEvents) {
                    let match = await this.matchService.findById(matchId);
                    this.updateMatchEventsForLineup(match, teamId, lineups);
                }
                return response.status(200).send({ success: true });
            } else {
                return response.status(400).send({
                    name: 'validation_error',
                    message: `Lineups can not be null`
                });
            }
        } catch (e) {
            logger.error(`Failed to create lineup`, e);
            return response.status(400).send({
                name: 'validation_error',
                message: `Failed to create lineup`
            });
        }
    }

    @Authorized()
    @Get('/lineup')
    async loadLineups(
        @QueryParam('matchId', { required: true }) matchId: number,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('teamId', { required: true }) teamId: number,
        @QueryParam('playerId') playerId: number,
        @QueryParam('positionId') positionId: number,
        @Res() response: Response
    ) {
        return this.matchService.findLineupsByParam(matchId, competitionId, teamId, playerId, positionId);
    }

    @Authorized()
    @Patch('/lineup/status')
    async updateLineupService(
        @Body() lineup: Lineup,
        @Res() response: Response
    ) {
        let savedLineup = await this.lineupService.findById(lineup.id);
        if (savedLineup) {
            savedLineup.playing = lineup.playing;
            return this.lineupService.createOrUpdate(savedLineup);
        } else {
            return response.status(400).send({
                name: 'search_error',
                message: `Lineup with id ${lineup.id} not found`
            });
        }
    }

    @Authorized()
    @Patch('/lineup/update')
    async updateLineups(
        @QueryParam('matchId') matchId: number,
        @QueryParam('teamId') teamId: number,
        @QueryParam('updateMatchEvents') updateMatchEvents: boolean,
        @Body() lineups: Lineup[],
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);
        if (match.matchStatus != 'ENDED') {
            if (lineups.length > 0) {
                if (matchId && teamId) {
                    await this.checkLineupsForExisting(matchId, teamId, lineups);
                }
                await this.matchService.batchSaveLineups(lineups);
                if (updateMatchEvents) {
                    this.updateMatchEventsForLineup(match, teamId, lineups);
                }
                let tokens = (await this.deviceService.findScorerDeviceFromRoster(matchId)).map(device => device.deviceId);
                if (tokens && tokens.length > 0) {
                    this.firebaseService.sendMessage({
                        tokens: tokens,
                        data: {
                            type: 'attendance_added',
                            matchId: matchId.toString(),
                            teamId: teamId.toString()
                        }
                    })
                }
                return this.matchService.findLineupsByParam(matchId, match.competitionId, teamId, null, null);
            } else {
                return response.status(400).send({ name: 'updated_lineup_error', message: 'List lineup is empty' });
            }
        } else {
            return response.status(400).send({
                name: 'update_lineup_error',
                message: 'Lineup cannot be submitted after a match has ended'
            });
        }
    }

    private async checkLineupsForExisting(matchId: number, teamId: number, lineups: Lineup[]) {
        let existingLineups = await this.lineupService.findByParams(
            matchId,
            null,
            teamId,
            null
        );
        lineups.forEach(lineup => {
            if (!lineup.id) {
                const existingLineup = existingLineups.filter(el =>
                    (el.matchId == lineup.matchId &&
                        el.teamId == lineup.teamId &&
                        el.playerId == lineup.playerId)
                );
                if (existingLineup && existingLineup.length != 0) {
                    lineup.id = existingLineup[0].id;
                }
            }
        });
    }

    @Authorized()
    @Delete('/lineup')
    async deleteLineup(
        @QueryParam('updateMatchEvents') updateMatchEvents: boolean,
        @Body() lineup: Lineup,
        @Res() response: Response
    ) {
        if (lineup) {
            console.time('matchService.findById');
            let match = await this.matchService.findById(lineup.matchId);
            console.timeEnd('matchService.findById');

            await this.matchService.deleteLineupById(lineup.id);
            await await this.gameTimeAttendanceService.deleteByMatchAndTeam(lineup.matchId, lineup.teamId, 0, true, lineup.playerId);
            if (updateMatchEvents) {
                this.updateMatchEventsForLineup(match, lineup.teamId, [lineup]);
            }
            let tokens = (await this.deviceService.findScorerDeviceFromRoster(lineup.matchId)).map(device => device.deviceId);
            if (tokens && tokens.length > 0) {
                this.firebaseService.sendMessage({
                    tokens: tokens,
                    data: {
                        type: 'attendance_added',
                        matchId: lineup.matchId.toString(),
                        teamId: lineup.teamId.toString()
                    }
                })
            }
            return response.status(200).send({ success: true });
        } else {
            return response.status(400).send({
                name: 'delete_lineup_error',
                message: 'List lineup is empty'
            });
        }
    }

    private async updateMatchEventsForLineup(
        match: Match,
        teamId: number,
        lineups: Lineup[]
    ) {
        let gsPlayerId;
        let gaPlayerId;
        for (let lu of lineups) {
            /// Checking for any player with position Goal shooter or
            /// goal attack
            if (lu.positionId == GamePosition.GOAL_SHOOTER) {
                gsPlayerId = lu.playerId;
            } else if (lu.positionId == GamePosition.GOAL_ATTACK) {
                gaPlayerId = lu.playerId;
            }
        }
        let team = match.team1Id == teamId ? 'team1' : 'team2';
        if (isNotNullAndUndefined(gsPlayerId)) {
            this.matchService.updateMatchStatEvent(
                match.id,
                team,
                GamePosition.GOAL_SHOOTER,
                gsPlayerId
            );
        } else if (isNotNullAndUndefined(gaPlayerId)) {
            this.matchService.updateMatchStatEvent(
                match.id,
                team,
                GamePosition.GOAL_ATTACK,
                gaPlayerId
            );
        }
    }

    @Authorized()
    @Post('/bulk/update')
    async bulkUpdate(
        @HeaderParam("authorization") currentUser: User,
        @Body() matchesData: Match[],
        @Res() response: Response
    ) {
        if (matchesData.length == 0) {
            return response.status(400).send({
                name: 'validation_error',
                message: `Empty match data provided`
            });
        }

        const promises = matchesData.map(async match => {
            let dbMatch = await this.matchService.findById(match.id);
            if (isNotNullAndUndefined(match.team1Score) && isNotNullAndUndefined(match.team2Score)) {
                dbMatch.team1Score = match.team1Score;
                dbMatch.team2Score = match.team2Score;
                if (dbMatch.matchStatus != "ENDED") {
                    let endTime = Date.now();
                    dbMatch.endTime = new Date(endTime);
                    dbMatch.matchStatus = "ENDED";
                }
                if (match.team1Score > match.team2Score) {
                    dbMatch.team1ResultId = 1;
                    dbMatch.team2ResultId = 2;
                } else if (match.team2Score > match.team1Score) {
                    dbMatch.team1ResultId = 2;
                    dbMatch.team2ResultId = 1;
                } else {
                    dbMatch.team1ResultId = 3;
                    dbMatch.team2ResultId = 3;
                }
            }

            return dbMatch;
        });

        const arr = await Promise.all(promises);

        if (arr.length > 0) {
            let data = await this.matchService.batchCreateOrUpdate(arr);
            if (data) {
                await this.performTeamLadderOperation(arr, currentUser.id);
                this.sendBulkMatchUpdateNotification(data, {subtype: 'bulk_end_matches'});
            }
            return data;
        } else {
            return response.status(212).send({
                success: false,
                message: "None of the match data got updated"
            });
        }
    }

    @Authorized()
    @Post('/bulk/end')
    async bulkEnd(
        @HeaderParam("authorization") currentUser: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('startTimeStart', { required: true }) startTimeStart: Date,
        @QueryParam('startTimeEnd', { required: true }) startTimeEnd: Date,
        @QueryParam('resultTypeId') resultTypeId: number,
        @Res() response: Response
    ) {
        let matchesData = await this.matchService.findByDate(new Date(startTimeStart), new Date(startTimeEnd), competitionId);

        let arr = [];
        let endTime = Date.now();
        if (resultTypeId) {
            for (let match of matchesData) {
                if (match.matchStatus != "ENDED") {
                    match.team1ResultId = resultTypeId;
                    match.team2ResultId = resultTypeId;
                    match.endTime = new Date(endTime);
                    match.matchStatus = "ENDED";
                    arr.push(match);
                }
            }
        } else {
            for (let match of matchesData) {
                if (match.matchStatus != "ENDED") {
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
                    match.endTime = new Date(endTime);
                    match.matchStatus = "ENDED";
                }
            }
        }

        if (arr.length > 0) {
            let data = await this.matchService.batchCreateOrUpdate(arr);
            if (data) {
                await this.performTeamLadderOperation(arr, currentUser.id);
                this.sendBulkMatchUpdateNotification(data, {subtype: 'bulk_end_matches'});
            }
        }
        return response.status(200).send({ success: true });
    }

    private async performTeamLadderOperation(matches: Match[], userId) {
        try {
            let divisionMap = new Map();
            let arr = [];
            //Team Ladder Operation
            for (let item of matches) {
                if (item.matchStatus == "ENDED") {
                    let ladderSettings = divisionMap.get(item.divisionId);
                    if (ladderSettings == undefined) {
                        ladderSettings = await this.competitionLadderSettingsService.getByCompetitionDivisionId(item.competitionId, item.divisionId);
                        divisionMap.set(item.divisionId, ladderSettings);
                    }

                    if (isArrayPopulated(ladderSettings)) {
                        let teamLadderList = await this.teamLadderService.getTeamLadderByMatch(item, ladderSettings, userId);
                        if (isArrayPopulated(teamLadderList)) {
                            arr.push(...teamLadderList);
                        }
                    }
                }
            }

            if (isArrayPopulated(arr)) {
                await this.teamLadderService.batchCreateOrUpdate(arr);
            }
        } catch (error) {
            logger.error(` Exception occurred in performTeamLadderOperation :: ${error}`);
            throw error;
        }
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
        let matchesData = await this.matchService.findByDate(new Date(startTimeStart), new Date(startTimeEnd), competitionId);

        let arr = [];
        let nonSilentNotifyMatches = [];
        let silentNotifyMatches = [];

        if (newDate) {
            if (new Date(newDate) > new Date()) {
                Array.prototype.push.apply(nonSilentNotifyMatches, matchesData);
            } else {
                Array.prototype.push.apply(silentNotifyMatches, matchesData);
            }

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
                    arr.push(match);
                    if (new Date(match.startTime) > new Date()) {
                        nonSilentNotifyMatches.push(match);
                    } else {
                        silentNotifyMatches.push(match);
                    }
                }
            } else if (type == 'forward') {
                for (let match of matchesData) {
                    const myDate = new Date(match.startTime);
                    if (hours) {
                        myDate.setHours(myDate.getHours() - hours);
                    }
                    if (minutes) {
                        myDate.setMinutes(myDate.getMinutes() - minutes);
                    }
                    if (seconds) {
                        myDate.setSeconds(myDate.getSeconds() - seconds);
                    }
                    match.startTime = new Date(myDate);
                    arr.push(match);
                    if (new Date(match.startTime) > new Date()) {
                        nonSilentNotifyMatches.push(match);
                    } else {
                        silentNotifyMatches.push(match);
                    }
                }
            }
        }
        if (arr.length > 0) {
            await this.matchService.batchCreateOrUpdate(arr);

            if (nonSilentNotifyMatches.length > 0) {
                this.sendBulkMatchUpdateNotification(
                    nonSilentNotifyMatches,
                    {subtype: 'bulk_time_matches', nonSilentNotify: true}
                );
            }
            if (silentNotifyMatches.length > 0) {
                this.sendBulkMatchUpdateNotification(
                    silentNotifyMatches,
                    {subtype: 'bulk_time_matches'}
                );
            }
        }

        return response.status(200).send({ success: true });
    }

    @Authorized()
    @Post('/bulk/doubleheader')
    async doubleHeader(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('round1', { required: true }) round1: string,
        @QueryParam('round2', { required: true }) round2: string,
        @Res() response: Response
    ) {
        let firstRoundArray = await this.roundService.findByName(
            competitionId,
            round1
        );
        let secondRoundArray = await this.roundService.findByName(
            competitionId,
            round2
        );

        if (isArrayPopulated(firstRoundArray) &&
            isArrayPopulated(secondRoundArray)) {
                let arr = [];
                let nonSilentNotifyMatches = [];
                let silentNotifyMatches = [];

                for (let r1 of firstRoundArray) {
                    for (let r2 of secondRoundArray) {
                        if (r2.divisionId === r1.divisionId) {
                            let firstMatchesArray = await this.matchService.findByRound(r1.id);
                            let secondMatchesArray = await this.matchService.findByRound(r2.id);

                            if (isArrayPopulated(firstMatchesArray) && isArrayPopulated(secondMatchesArray)) {
                                let secondMatchTemplate = secondMatchesArray[0];
                                if (secondMatchTemplate.startTime) {
                                    for (let m1 of firstMatchesArray) {
                                        if (m1.type == 'FOUR_QUARTERS' &&
                                            (m1.extraTimeDuration == null || m1.extraTimeDuration == undefined)) {
                                                m1.startTime = secondMatchTemplate.startTime;
                                                m1.type = 'TWO_HALVES';
                                                m1.matchDuration = m1.matchDuration / 2;
                                                arr.push(m1);
                                                if (new Date(m1.startTime) > new Date()) {
                                                    nonSilentNotifyMatches.push(m1);
                                                } else {
                                                    silentNotifyMatches.push(m1);
                                                }
                                        }
                                    }
                                }

                                for (let m2 of secondMatchesArray) {
                                    if (m2.type == 'FOUR_QUARTERS') {
                                        m2.startTime =
                                            new Date(m2.startTime.getTime() +
                                                ((m2.matchDuration / 2) +
                                                  m2.breakDuration +
                                                  m2.mainBreakDuration)
                                            );
                                        m2.type = 'TWO_HALVES';
                                        m2.matchDuration = m2.matchDuration / 2;
                                        arr.push(m2);
                                        if (new Date(m2.startTime) > new Date()) {
                                            nonSilentNotifyMatches.push(m2);
                                        } else {
                                            silentNotifyMatches.push(m2);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (arr.length > 0) {
                    await this.matchService.batchCreateOrUpdate(arr);

                    if (nonSilentNotifyMatches.length > 0) {
                        this.sendBulkMatchUpdateNotification(
                            nonSilentNotifyMatches,
                            {subtype: 'bulk_double_header', nonSilentNotify: true}
                        );
                    }
                    if (silentNotifyMatches.length > 0) {
                        this.sendBulkMatchUpdateNotification(
                            silentNotifyMatches,
                            {subtype: 'bulk_double_header'}
                        );
                    }

                    return response.status(200).send({ success: true });
                } else {
                    return response.status(212).json({
                        success: false,
                        message: "cannot find matches with the provided rounds"
                    });
                }
        } else {
            response.status(212).json({
                success: false,
                message: "cannot find rounds with the provided names"
            });
        }
    }

    @Authorized()
    @Post('/import')
    async importMatch(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @UploadedFile("file", { required: true }) file: Express.Multer.File,
        @Res() response: Response
    ) {
        const requiredField = [
            'Date',
            'Time',
            'Division Grade',
            'Home Team',
            'Away Team',
            'Venue',
            'Type',
            'Match Duration',
            'Break Duration',
            'Main Break Duration',
            'Timezone GMT',
            'Round'
        ];

        const bufferString = file.buffer.toString('utf8');
        const data = arrangeCSVToJson(bufferString);

        const { result: importArr, message } = validationForField({
            filedList: requiredField,
            values: data,
        });

        let queryArr = [];
        for (let i of importArr) {
            let timeZone = parseDateTimeZoneString(i.Date, i.Time, i["Timezone GMT"]);
            let startTimeInUTC = new Date(timeZone);
            let divisionData = await this.divisionService.findByName(i["Division Grade"], competitionId);
            let team1Data = await this.teamService.findByNameAndCompetition(i["Home Team"], competitionId, divisionData.length > 0 ? divisionData[0].name : undefined);
            let team2Data = await this.teamService.findByNameAndCompetition(i["Away Team"], competitionId, divisionData.length > 0 ? divisionData[0].name : undefined);
            let venueData = await this.competitionVenueService.findByCourtName(i["Venue"], competitionId);
            let roundData;
            if (!!divisionData[0] && !!team1Data[0] && !!team2Data[0] && !!venueData[0]) {
                let rounds = await this.roundService.findByName(competitionId, i["Round"], divisionData[0].id);
                roundData = rounds[0];

                if (!roundData) {
                    let round = new Round();
                    let value;
                    if (i["Round"].indexOf(" ") > -1) {
                        const roundSplitStr = i["Round"].split(" ");
                        value = stringTONumber(roundSplitStr[1]);
                    } else {
                        value = stringTONumber(i["Round"]);
                    }
                    round.competitionId = competitionId;
                    round.divisionId = divisionData[0].id;
                    round.name = i["Round"];
                    round.sequence = value;
                    roundData = await this.roundService.createOrUpdate(round);
                }

                let match = new Match();
                match.startTime = startTimeInUTC;
                match.competitionId = competitionId;
                match.type = i.Type;
                match.matchDuration = stringTONumber(i["Match Duration"]);
                match.breakDuration = stringTONumber(i["Break Duration"]);
                match.mainBreakDuration = stringTONumber(i["Main Break Duration"]);
                match.mnbMatchId = i.mnbMatchId;
                match.roundId = roundData.id;
                match.team1Score = 0;
                match.team2Score = 0;
                match.divisionId = divisionData[0].id;
                match.team1Id = team1Data[0].id;
                match.team2Id = team2Data[0].id;
                match.venueCourtId = venueData[0].id;

                queryArr.push(match);
            } else {
                if (message[`Line ${i.line}`]) {
                    if (!message[`Line ${i.line}`].message) {
                        message[`Line ${i.line}`].message = [];
                    }
                } else {
                    message[`Line ${i.line}`] = {
                        ...i,
                        message: [],
                    };
                }

                if (!divisionData[0]) message[`Line ${i.line}`].message.push('The division entered is not associated with this competition.');
                if (!team1Data[0]) message[`Line ${i.line}`].message.push(`Can't find the team named "${i['Home Team']}"`);
                if (!team2Data[0]) message[`Line ${i.line}`].message.push(`Can't find the team named "${i['Away Team']}"`);
                if (!venueData[0]) message[`Line ${i.line}`].message.push(`Can't find the venue court named "${i['Venue']}"`);
            }
        }

        const totalCount = data.length;
        const successCount = queryArr.length;
        const failedCount = data.length - queryArr.length;
        const resMsg = `${totalCount} lines processed. ${successCount} lines successfully imported and ${failedCount} lines failed.`;

        await this.matchService.batchCreateOrUpdate(queryArr);

        return response.status(200).send({
            success: true,
            message: resMsg,
            error: message,
            data: queryArr,
            rawData: data,
        });
    }

    @Authorized()
    @Post('/bulk/courts')
    async bulkUpdateCourts(
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @QueryParam('startTime', { required: true }) startTime: Date,
        @QueryParam('endTime', { required: true }) endTime: Date,
        @QueryParam('fromCourtIds', { required: true }) fromCourtIds: number[],
        @QueryParam('toCourtId', { required: true }) toCourtId: number,
        @Res() response: Response
    ): Promise<any> {
        const getMatches = await this.matchService.getMatchDetailsForVenueCourtUpdate(competitionId, startTime, endTime, fromCourtIds);

        if (isArrayPopulated(getMatches)) {
            let nonSilentNotifyMatches = [];
            let silentNotifyMatches = [];
            const mArray = [];

            for (let i of getMatches) {
                let m = new Match();
                m.id = i.id;
                m.venueCourtId = toCourtId;
                mArray.push(m);
                if (new Date(m.startTime) > new Date()) {
                    nonSilentNotifyMatches.push(m);
                } else {
                    silentNotifyMatches.push(m);
                }
            }

            await this.matchService.batchCreateOrUpdate(mArray);

            if (nonSilentNotifyMatches.length > 0) {
                this.sendBulkMatchUpdateNotification(
                    nonSilentNotifyMatches,
                    {subtype: 'bulk_court_matches', nonSilentNotify: true}
                );
            }
            if (silentNotifyMatches.length > 0) {
                this.sendBulkMatchUpdateNotification(
                    silentNotifyMatches,
                    {subtype: 'bulk_court_matches'}
                );
            }

            return response.status(200).send({ success: true, message: "venue courts update successfully" });
        } else {
            return response.status(212).send({
                success: false,
                message: "cannot find matches within the provided duration"
            });
        }
    }

    @Authorized()
    @Get('/export')
    async exportMatches(
        @QueryParam('from') from: Date,
        @QueryParam('to') to: Date,
        @QueryParam('teamIds') teamIds: number[] = [],
        @QueryParam('playerIds') playerIds: number[],
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('organisationIds') organisationIds: number[],
        @QueryParam('matchEnded') matchEnded: boolean,
        @QueryParam('matchStatus') matchStatus: ("STARTED" | "PAUSED" | "ENDED")[],
        @QueryParam('offset') offset: number = undefined,
        @QueryParam('limit') limit: number = undefined,
        @QueryParam('search') search: string,
        @Res() response: Response
    ): Promise<any> {
        const getMatchesData = await this.find(from, to, teamIds, playerIds, competitionId, null, organisationIds, matchEnded, matchStatus, null, null, null);

        if (isArrayPopulated(getMatchesData)) {
            getMatchesData.map(e => {
                e['Match Id'] = e.id;
                e['Start Time'] = e.startTime;
                e['Home'] = e.team1.name;
                e['Away'] = e.team2.name;
                e['Venue'] = e.venueCourt.venue.name;
                e['Division'] = e.division.name;
                e['Type'] = e.type === 'TWO_HALVES' ? 'Halves' : (e.type === 'SINGLE' ? 'Single' : (e.type === 'FOUR_QUARTERS' ? 'Quarters' : ''));
                e['Score'] = e.team1Score + ':' + e.team2Score;
                e['Match Duration'] = e.matchDuration;
                e['Main Break'] = e.mainBreakDuration;
                e['Quarter Break'] = e.breakDuration;
                delete e.breakDuration
                delete e.centrePassStatus
                delete e.centrePassWonBy
                delete e.competition
                delete e.competitionId
                delete e.created_at
                delete e.deleted_at
                delete e.division
                delete e.divisionId
                delete e.endTime
                delete e.extraTimeDuration
                delete e.mainBreakDuration
                delete e.id
                delete e.matchDuration
                delete e.matchEnded
                delete e.matchStatus
                delete e.mnbMatchId
                delete e.mnbPushed
                delete e.originalStartTime
                delete e.pauseStartTime
                delete e.round
                delete e.roundId
                delete e.scorerStatus
                delete e.startTime
                delete e.team1
                delete e.team1Id
                delete e.team1ResultId
                delete e.team1Score
                delete e.team2Id
                delete e.team2
                delete e.team2ResultId
                delete e.team2Score
                delete e.totalPausedMs
                delete e.type
                delete e.updated_at
                delete e.venueCourt
                delete e.venueCourtId
                return e;
            });
        } else {
            getMatchesData.push({
                'Match Id': 'N/A',
                'Start Time': 'N/A',
                'Home': 'N/A',
                'Away': 'N/A',
                'Venue': 'N/A',
                'Division': 'N/A',
                'Type': 'N/A',
                'Score': 'N/A',
                'Match Duration': 'N/A',
                'Main Break': 'N/A',
                'Quarter Break': 'N/A'
            });
        }

        response.setHeader('Content-disposition', 'attachment; filename=matches.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv.write(getMatchesData, { headers: true })
            .on("finish", function () {
            })
            .pipe(response);
    }

    private async sendBulkMatchUpdateNotification(
        matches: Match[],
        optionals?: { subtype?: string, nonSilentNotify?: boolean }
    ) {
        try {
            var messageBody: String = undefined;
            if (optionals &&
                (optionals.nonSilentNotify != null || optionals.nonSilentNotify != undefined) &&
                optionals.nonSilentNotify == true) {
                    messageBody = 'A number of changes have been made to your matches. Please check match details.';
            }

            if (isArrayPopulated(matches)) {
                var deviceTokensArray = Array();
                var matchIdsArray = Array();
                for (let match of matches) {
                    matchIdsArray.push(match.id);

                    //send by roster and ure
                    let matchDevices = await this.deviceService.findDeviceByMatch(match);
                    let matchDeviceTokens = (matchDevices).map(device => device.deviceId);
                    if (matchDeviceTokens && matchDeviceTokens.length > 0) {
                        Array.prototype.push.apply(deviceTokensArray, matchDeviceTokens);
                    }

                    let list = await this.watchlistService.loadByParam(match.id, [match.team1Id, match.team2Id]);
                    let watchlistDeviceTokens = (list).map(wl => wl['token']);
                    if (watchlistDeviceTokens && watchlistDeviceTokens.length > 0) {
                        Array.prototype.push.apply(deviceTokensArray, watchlistDeviceTokens);
                    }
                }

                if (isArrayPopulated(deviceTokensArray)) {
                    let uniqTokens = new Set(deviceTokensArray);
                    let dataDict = {};
                    dataDict["type"] = "bulk_matches_updated";
                    dataDict["matchIds"] = JSON.stringify(matchIdsArray);
                    if (optionals && optionals.subtype) {
                        dataDict["subtype"] = optionals.subtype;
                    }
                    this.firebaseService.sendMessageChunked({
                        body: messageBody,
                        tokens: Array.from(uniqTokens),
                        data: dataDict
                    });
                } else {
                    logger.error(`Cannot send message for empty device tokens list`);
                }
            } else {
                logger.error(`Cannot send message for empty match list`);
            }
        } catch (e) {
            logger.error(`Failed send message for matches ${matches}`, e);
        }
    }

    @Authorized()
    @Get('/print')
    async print(
        @HeaderParam('authorization') user: User,
        @QueryParam('divisionIds') divisionIds: number[] = [],
        @QueryParam('matchPrintTemplateId') matchPrintTemplateId: number,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('teamIds') teamIds: number[],
        @QueryParam('templateType') templateType: string,
        @QueryParam('roundName') roundName: string,
        @Res() response: Response
    ): Promise<any> {
        try {
            const competition = await this.competitionService.findById(competitionId);
            const organisation = await this.organisationService.getOrganisationLogoDetails(competition.organisationId);

            this.matchService.printMatchSheetTemplate(
                templateType,
                user,
                organisation,
                competition,
                divisionIds,
                teamIds,
                roundName,
            ).then((matchSheet) => {
                this.matchSheetService.createOrUpdate(matchSheet);
            });

            return response.status(200).send({ success: true });
        } catch (e) {
            return response.status(212).send({ success: false });
        }
    }

    @Authorized()
    @Get('/downloads')
    async download(
        @HeaderParam('authorization') user: User,
        @QueryParam('competitionId') competitionId: number,
        @Res() response: Response
    ): Promise<any> {
        try {
            const matchSheets = await this.matchSheetService.findByCompetitionId(user.id, competitionId);

            return response.status(200).send({ success: true, data: matchSheets });
        } catch (e) {
            console.log(e);
            return response.status(212).send({ success: false });
        }
    }

    @Authorized()
    @Post(`/livestreamURL`)
    async updateLivestreamURL(
        @Body() match: Match,
        @Res() response: Response
    ): Promise<any> {
        if (match &&
            isNotNullAndUndefined(match.id) &&
            isNotNullAndUndefined(match.livestreamURL)) {
                await this.matchService.updateLivestreamURL(match.id, match.livestreamURL);
                const updatedMatch = await this.matchService.findById(match.id);
                /// Need to send notification of match update event
                this.sendMatchEvent(updatedMatch, false, {subtype: 'match_livestreamURL_updated'});

                return updatedMatch;
        } else {
            return response.status(400).send({
                name: 'missing_parameters',
                message: `Missing parameters`
            });
        }
    }

    @Authorized()
    @Post('/startExtraTime')
    async startExtraTimeMatch(
        @HeaderParam("authorization") user: User,
        @QueryParam('matchId', { required: true }) matchId: number,
        @QueryParam('msFromStart', { required: true }) msFromStart: number,
        @QueryParam('period', { required: true }) period: number,
        @QueryParam('isExtraExtra') isExtraExtra: boolean = false,
        @Res() response: Response
    ) {
        let match = await this.matchService.findById(matchId);
        if (match) {
            let startExtraTime = msFromStart ? (match.startTime.getTime() + msFromStart) : Date.now();
            if (isExtraExtra) {
                match.extraExtraStartTime = new Date(startExtraTime);
            } else {
                match.extraStartTime = new Date(startExtraTime);
            }
            await this.matchService.createOrUpdate(match);
        } else {
            return response.status(400).send({
                name: 'search_error',
                message: `Match with id ${matchId} not found`
            });
        }
        this.sendMatchEvent(match, false, {user: user});
        this.matchService.logLiteMatchEvent(
            matchId,
            'timer',
            isExtraExtra ? 'extraStart' : 'extraExtraStart',
            period,
            isExtraExtra? match.extraExtraStartTime : match.extraStartTime,
            user.id
        );
        return match;
    }
}
