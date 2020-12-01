import {Response} from 'express';
import {
    Authorized,
    Body,
    Delete,
    Get,
    HeaderParam,
    JsonController,
    Patch,
    Post,
    QueryParam,
    Res
} from 'routing-controllers';
import * as fastcsv from 'fast-csv';

import {convertMatchStartTimeByTimezone} from '../utils/TimeFormatterUtils';
import {isArrayPopulated} from '../utils/Utils';
import {BaseController} from './BaseController';
import {Roster} from '../models/security/Roster';
import {EntityType} from '../models/security/EntityType';
import {User} from '../models/User';
import {Competition} from '../models/Competition';
import {RequestFilter} from '../models/RequestFilter';
import {StateTimezone} from '../models/StateTimezone';
import {UserRoleEntity} from '../models/security/UserRoleEntity';
import {Role} from '../models/security/Role';
import { isNotNullAndUndefined } from "../utils/Utils";

@JsonController('/roster')
export class RosterController extends BaseController {

    @Authorized()
    @Get('/')
    async get(@HeaderParam("authorization") user: User, @QueryParam("id") id: number) {
        if (!id) {
            return this.findByUser(user)
        }
        return this.rosterService.findFullById(id);
    }

    @Authorized()
    @Get('/users')
    async rosterUserList(
        @QueryParam("competitionId") competitionId: number,
        @QueryParam("roleId") roleId: number,
        @Res() response: Response
    ) {
        if (competitionId && roleId) {
            return this.rosterService.findUsersByRole(competitionId, roleId);
        } else {
            return response.status(200).send({
                name: 'search_error',
                message: `Invalid parameters`
            });
        }
    }

    @Authorized()
    @Post('/list')
    async rosterList(
        @QueryParam("competitionId") competitionId: number,
        @QueryParam("roleIds") roleIds: number[],
        @QueryParam("status") status: string,
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC" | "DESC" = undefined,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response
    ) {
        if (competitionId && isArrayPopulated(roleIds)) {
            return this.rosterService.findUserRostersByCompetition(
                competitionId,
                roleIds,
                status,
                requestFilter,
                sortBy,
                sortOrder
            );
        } else {
            return response.status(200).send({
                name: 'search_error', message: `Invalid parameters`
            });
        }
    }

    @Authorized()
    @Post('/admin')
    async rosterListAdmin(
        @QueryParam('entityTypeId', { required: true }) entityTypeId: number,
        @QueryParam('entityId', { required: true }) entityId: number,
        @QueryParam("roleId", { required: true }) roleId: number,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response,
        @QueryParam('sortBy') sortBy?: string,
        @QueryParam('sortOrder') sortOrder?: "ASC" | "DESC",
    ) {
        if (isNotNullAndUndefined(entityTypeId) &&
            isNotNullAndUndefined(entityId) &&
            isNotNullAndUndefined(roleId)) {
                return this.rosterService.findByEntityId(
                    entityTypeId,
                    entityId,
                    roleId,
                    requestFilter,
                    sortBy,
                    sortOrder
                );
        } else {
            return response.status(200).send({
                name: 'search_error',
                message: `Invalid parameters`
            });
        }
    }

    @Authorized()
    @Delete('/')
    async delete(
      @QueryParam("id") id: number,
      @QueryParam('category') category: "Scoring" | "Umpiring" | "UmpireReserve" | "UmpireCoach",
      @Res() response: Response
    ) {
        let roster = await this.rosterService.findById(id);
        if (roster) {
            /// Delete necessary dependencies before deleting roster
            switch (category) {
              case "Umpiring":
                  await this.matchUmpireService.deleteByParms(roster.matchId, roster.userId);
                  break;
              default:
                  break;
            }
            let result = await this.rosterService.delete(roster);
            if (result) {
                switch (category) {
                    case "Scoring":
                        let scorerDeviceTokens = (await this.deviceService.findScorerDeviceFromRoster(undefined, id)).map(device => device.deviceId);
                        if (scorerDeviceTokens && scorerDeviceTokens.length > 0) {
                            this.firebaseService.sendMessageChunked({
                                tokens: scorerDeviceTokens,
                                data: {
                                    type: 'remove_scorer_match',
                                    rosterId: id.toString(),
                                    matchId: roster.matchId.toString()
                                }
                            })
                        }
                        break;
                    case "Umpiring":
                    case "UmpireReserve":
                    case "UmpireCoach":
                        let umpireDeviceTokens = (await this.deviceService.getUserDevices(roster.userId)).map(device => device.deviceId);
                        if (umpireDeviceTokens && umpireDeviceTokens.length > 0) {
                            this.firebaseService.sendMessageChunked({
                                tokens: umpireDeviceTokens,
                                data: {
                                    type: 'remove_umpire_match',
                                    rosterId: id.toString(),
                                    matchId: roster.matchId.toString()
                                }
                            });
                        }
                        break;
                    default:
                        let tokens = (await this.deviceService.getUserDevices(roster.userId)).map(device => device.deviceId);
                        if (tokens && tokens.length > 0) {
                            this.firebaseService.sendMessageChunked({
                                tokens: tokens,
                                data: {
                                    type: 'user_roster_removed',
                                    rosterId: id.toString()
                                }
                            });
                        }
                        break;
                }

                return response.status(200).send({ delete: true, data: result });
            } else {
                return response.status(404).send({
                    name: 'delete_error',
                    message: `Roster with id [${id}] could not be deleted`
                });
            }
        } else {
            return response.status(404).send({
                name: 'search_error',
                message: `Roster with id [${id}] not found`
            });
        }
    }

    @Authorized()
    @Get('/')
    async findByUser(@HeaderParam("authorization") user: User): Promise<Roster[]> {
        return this.rosterService.findByUser(user.id);
    }

    @Authorized()
    @Get('/match')
    async findByMatchIds(
        @QueryParam('ids') matchIds: number[] = [],
        @Res() response: Response
    ) {
        if (!matchIds || matchIds.length == 0) {
            return response.status(400).send({
                name: 'validation_error',
                message: 'Match id`s required.'
            });
        }
        return this.rosterService.findByMatchIds(matchIds);
    }

    @Authorized()
    @Get('/all')
    async findAllRostersByParam(
        @QueryParam('matchIds') matchIds: number[] = [],
        @Res() response: Response
    ) {
        if (!matchIds || matchIds.length == 0) {
            return response.status(400).send({
                name: 'validation_error',
                message: 'Match id`s required.'
            });
        }
        return this.rosterService.findAllRostersByParam(matchIds);
    }

    @Authorized()
    @Get('/event')
    async findUserEventRosters(@HeaderParam("authorization") user: User): Promise<Roster[]> {
        return this.rosterService.findRosterEventByUser(user.id);
    }

    @Authorized()
    @Post('/')
    async addRoster(
        @HeaderParam("authorization") user: User,
        @Body() roster: Roster,
        @QueryParam('category', { required: true }) category: "Scoring" | "Playing" | "Event" | "Umpiring" | "UmpireReserve" | "UmpireCoach",
        @Res() response: Response
    ) {
        if (!roster) {
            return response.status(400).send({
                name: 'validation_error',
                message: 'Roster in body required.'
            });
        }
        let savedRoster = await this.rosterService.createOrUpdate(roster);
        if (savedRoster) {
            if (category == "Scoring" || category == "Playing") {
                await this.evaluateWatchlist(roster, user.id);
            }
            await this.notifyRosterChange(user, savedRoster, category);
            return savedRoster;
        } else {
            return response.status(400).send({
                name: 'save_error',
                message: `Sorry, unable to save the roster`
            });
        }
    }

    @Authorized()
    @Patch('/')
    async updateStatus(
        @HeaderParam("authorization") user: User,
        @QueryParam('rosterId', { required: true }) rosterId: number,
        @QueryParam('status', { required: true }) status: "YES" | "NO" | "LATER" | "MAYBE",
        @QueryParam('category', { required: true }) category: "Scoring" | "Playing" | "Event" | "Umpiring" | "UmpireReserve" | "UmpireCoach",
        @QueryParam('callViaWeb') callViaWeb: boolean = false,
        @Res() response: Response
    ) {
        let roster = await this.rosterService.findFullById(rosterId);
        if (roster) {
            roster.status = status;
            let result = await this.rosterService.createOrUpdate(roster);

            switch (category) {
                case "Scoring":
                    let scoringDeviceTokens = (await this.deviceService.findManagerDevice(result.teamId)).map(device => device.deviceId);
                    if (scoringDeviceTokens && scoringDeviceTokens.length > 0) {
                        if (status == "NO") {
                            this.firebaseService.sendMessageChunked({
                                tokens: scoringDeviceTokens,
                                title: `Scorer declined match: ${roster.match.team1.name} vs ${roster.match.team2.name}`,
                                body: 'Assign someone else to score',
                                data: {
                                    type: 'scorer_decline_match',
                                    entityTypeId: EntityType.USER.toString(),
                                    entityId: user.id.toString(),
                                    matchId: roster.matchId.toString()
                                }
                            });
                        } else if (status == "YES") {
                            this.firebaseService.sendMessageChunked({
                                tokens: scoringDeviceTokens,
                                data: {
                                    type: 'scorer_accept_match',
                                    entityTypeId: EntityType.USER.toString(),
                                    entityId: user.id.toString(),
                                    matchId: roster.matchId.toString()
                                }
                            });
                        }
                    }
                    break;
                case "Playing":
                    let managerAndCoachDeviceTokens = (await this.deviceService.findManagerAndCoachDevices(roster.teamId)).map(device => device.deviceId);
                    if (managerAndCoachDeviceTokens && managerAndCoachDeviceTokens.length > 0) {
                        this.firebaseService.sendMessageChunked({
                            tokens: managerAndCoachDeviceTokens,
                            data: {
                                type: 'player_status_update',
                                entityTypeId: EntityType.USER.toString(),
                                entityId: user.id.toString(),
                                matchId: roster.matchId.toString()
                            }
                        });
                    }
                    break;
                case "Event":
                    let eventDeviceTokens = (await this.deviceService.getUserDevices(roster.eventOccurrence.created_by)).map(device => device.deviceId);
                    if (eventDeviceTokens && eventDeviceTokens.length > 0) {
                        this.firebaseService.sendMessageChunked({
                            tokens: eventDeviceTokens,
                            data: {
                                type: 'event_invitee_update',
                                entityTypeId: EntityType.USER.toString(),
                                entityId: user.id.toString(),
                                eventOccurrenceId: roster.eventOccurrenceId.toString()
                            }
                        });
                    }
                    break;
                case "Umpiring":
                case "UmpireReserve":
                case "UmpireCoach":
                    let umpireDeviceTokens = (await this.deviceService.findManagerDevice(result.teamId)).map(device => device.deviceId);
                    if (umpireDeviceTokens && umpireDeviceTokens.length > 0) {
                        if (status == "NO") {
                            this.firebaseService.sendMessageChunked({
                                tokens: umpireDeviceTokens,
                                data: {
                                    type: 'umpire_decline_match',
                                    entityTypeId: EntityType.USER.toString(),
                                    entityId: user.id.toString(),
                                    matchId: roster.matchId.toString()
                                }
                            });
                        } else if (status == "YES") {
                            this.firebaseService.sendMessageChunked({
                                tokens: umpireDeviceTokens,
                                data: {
                                    type: 'umpire_accept_match',
                                    entityTypeId: EntityType.USER.toString(),
                                    entityId: user.id.toString(),
                                    matchId: roster.matchId.toString()
                                }
                            });
                        }
                    }
                    break;
            }

            if (callViaWeb) {
                let tokens = (await this.deviceService.getUserDevices(roster.userId)).map(device => device.deviceId);
                if (tokens && tokens.length > 0) {
                    this.firebaseService.sendMessageChunked({
                        tokens: tokens,
                        data: {
                            type: 'user_roster_updated',
                            rosterId: rosterId.toString()
                        }
                    });
                }
            }

            return result;
        } else {
            return response.status(404).send({
                name: 'search_error',
                message: `Roster with id [${rosterId}] not found`
            });
        }
    }

    @Post("/broadcast")
    async broadcastRoster(
        @QueryParam("userId", { required: true }) userId: number,
        @Res() response: Response
    ) {
        let tokens = (await this.deviceService.getUserDevices(userId)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
            this.firebaseService.sendMessageChunked({
                tokens: tokens,
                data: {
                    type: 'update_scorer_roster'
                }
            })
        }
        return response.status(200).send({ success: true });
    }

    // specific response to allow inline editing for admin
    @Authorized()
    @Post('/admin/assign')
    async addAdminRoster(
        @Body() roster: Roster,
        @Res() response: Response
    ) {
        if (!roster) {
            return response.status(400).send({
                name: 'validation_error',
                message: 'Roster in body required.'
            });
        } else if (!roster.userId || !roster.roleId || !roster.matchId) {
            return response.status(400).send({
                name: 'validation_error',
                message: 'Roster data incomplete.'
            });
        }

        var existingRoster = await this.rosterService.getRosterStatus(roster.roleId, roster.teamId, roster.matchId);
        if (existingRoster) {
            existingRoster.userId = roster.userId;
            existingRoster = await this.rosterService.createOrUpdate(existingRoster);
        } else {
            existingRoster = await this.rosterService.createOrUpdate(roster);
        }

        if (existingRoster) {
            let tokens = (await this.deviceService.getUserDevices(existingRoster.userId)).map(device => device.deviceId);
            if (tokens && tokens.length > 0) {
                this.firebaseService.sendMessageChunked({
                    tokens: tokens,
                    data: {
                        type: 'add_scorer_match',
                        rosterId: roster.id.toString(),
                        matchId: roster.matchId.toString()
                    }
                })
            }
        }

        return this.rosterService.findAdminRosterId(existingRoster.id);
    }

    // specific response to allow inline editing for admin
    @Authorized()
    @Delete('/admin')
    async deleteAdminRoster(
        @QueryParam("id") id: number,
        @QueryParam('category') category: "Scoring" | "Umpiring" | "UmpireReserve" | "UmpireCoach",
        @Res() response: Response
    ) {
        return await this.delete(
            id,
            category,
            response
        );
    }

    @Authorized()
    @Get('/eventRosters')
    async findEventRosters(
        @QueryParam("eventOccurrenceId") eventOccurrenceId: number
    ): Promise<Roster[]> {
        return this.rosterService.findByEventOccurrence(eventOccurrenceId);
    }

    @Authorized()
    @Get('/exportScorer')
    async exportScorer(
        @QueryParam('entityTypeId', { required: true }) entityTypeId: number,
        @QueryParam('entityId', { required: true }) entityId: number,
        @QueryParam("roleId", { required: true }) roleId: number,
        @Res() response: Response
    ): Promise<any> {
        const requestFilter: RequestFilter = { paging: { offset: null, limit: null }, search: null };

        if (isNotNullAndUndefined(entityTypeId) &&
            isNotNullAndUndefined(entityId) &&
            isNotNullAndUndefined(roleId)) {
                const getScorersData = await this.rosterService.findByEntityId(
                    entityTypeId,
                    entityId,
                    roleId,
                    requestFilter
                );

                if (isArrayPopulated(getScorersData.users)) {
                    getScorersData.users.map(e => {
                        e['Email'] = e['email']
                        e['First Name'] = e['firstName']
                        e['Last Name'] = e['lastName']
                        e['Contact No'] = e['mobileNumber'];
                        const teamArray = [];
                        if (isArrayPopulated(e['teams'])) {
                            for (let i of e['teams']) teamArray.push(i['name']);
                        }
                        e['Team'] = teamArray.toString().replace(",", '\n');
                        delete e['teams']
                        delete e['email']
                        delete e['id']
                        delete e['firstName']
                        delete e['lastName']
                        delete e['mobileNumber']
                        return e;
                    });
                } else {
                    getScorersData.users.push({
                        ['Email']: 'N/A',
                        ['First Name']: 'N/A',
                        ['Last Name']: 'N/A',
                        ['Contact No']: 'N/A',
                        ['Team']: 'N/A',
                    });
                }

                response.setHeader('Content-disposition', 'attachment; filename=scorer.csv');
                response.setHeader('content-type', 'text/csv');
                fastcsv.write(getScorersData.users, { headers: true })
                    .on("finish", function () {
                    })
                    .pipe(response);
        } else {
            return response.status(212).send({
                name: 'parameter_required',
                message: `Invalid parameters passed`
            });
        }
    }

    @Authorized()
    @Get('/export/umpire')
    async exportUmpire(
        @QueryParam("competitionId") competitionId: number,
        @QueryParam("roleId") roleId: number,
        @QueryParam("status") status: string,
        @Res() response: Response
    ): Promise<any> {
        if (competitionId && roleId) {
            const dict = await this.rosterService.findUserRostersByCompetition(competitionId, [roleId], status, null);
            let competition: Competition = await this.competitionService.findById(competitionId);
            let competitionTimezone: StateTimezone;
            if (competition && competition.locationId) {
                competitionTimezone = await this.matchService.getMatchTimezone(competition.locationId);
            }

            if (isArrayPopulated(dict.results)) {
                let constants = require('../constants/Constants');
                dict.results.map(e => {
                    e['First Name'] = e['user']['firstName']
                    e['Last Name'] = e['user']['lastName']
                    const orgArray = [];
                    if (isArrayPopulated(e['user']['userRoleEntities'])) {
                        for (let i of e['user']['userRoleEntities']) {
                            orgArray.push(i['competitionOrganisation']['name']);
                        }
                    }
                    e['Affiliate'] = orgArray.toString().replace(",", '\n');
                    e['Match Id'] = e['matchId'];
                    e['Start Time'] = convertMatchStartTimeByTimezone(
                        e['match']['startTime'],
                        competitionTimezone != null ? competitionTimezone.timezone : null,
                        `${constants.DATE_FORMATTER_KEY} ${constants.TIME_FORMATTER_KEY}`
                    );
                    e['Status'] = e['status'];

                    delete e['id'];
                    delete e['roleId'];
                    delete e['matchId'];
                    delete e['teamId'];
                    delete e['userId'];
                    delete e['eventOccurrenceId'];
                    delete e['status'];
                    delete e['locked'];
                    delete e['match'];
                    delete e['user'];
                    return e;
                });
            } else {
                dict.results.push({
                    ['First Name']: 'N/A',
                    ['Last Name']: 'N/A',
                    ['Affiliate']: 'N/A',
                    ['Match Id']: 'N/A',
                    ['Start Time']: 'N/A',
                    ['Status']: 'N/A'
                });
            }

            response.setHeader('Content-disposition', 'attachment; filename=umpire-roster.csv');
            response.setHeader('content-type', 'text/csv');
            fastcsv.write(dict.results, { headers: true })
                .on("finish", function () {
                })
                .pipe(response);
        } else {
            return response.status(212).send({
                name: 'parameter_required',
                message: `Invalid parameters passed`
            });
        }
    }

    private async evaluateWatchlist(roster: Roster, createdBy: number) {
        let deviceIds = (await this.deviceService.getUserDevices(roster.userId)).map(device => device.deviceId);
        if (isArrayPopulated(deviceIds)) {
            let needToSetWatch = true;
            let userWatchlist = await this.watchlistService.findByParam(roster.userId);
            for (let watchItem of userWatchlist) {
                if (watchItem.entityTypeId == EntityType.TEAM &&
                      roster.teamId == watchItem.entityId) {
                          needToSetWatch  = false;
                          break;
                }
            }

            if (needToSetWatch) {
              await this.createWatchlist(
                  roster.userId,
                  roster.teamId,
                  createdBy,
                  deviceIds
              );
            }
        }
    }

    private async createWatchlist(
        userId: number,
        teamId: number,
        createdBy: number,
        deviceIds: string[]
    ) {
        let topics = await this.loadTopics([teamId], []);
        if (topics.length > 0) {
            await this.firebaseService.subscribeTopic(deviceIds, topics)
        }

        const watchlistSavePromises = [];
        deviceIds.forEach(async deviceId => {
          watchlistSavePromises.push(
              this.watchlistService.save(userId, deviceId, [], [teamId])
          );
        });
        await Promise.all(watchlistSavePromises);

        /// On saving of watchlist we will add the user spectator role
        /// to those team's or organisation's
        let compIds: number[] = [];
        const teamList = await this.teamService.findByIds([teamId]);
        teamList.forEach((team) => {
            compIds.push(team.competitionId);
        });

        if (compIds.length > 0) {
            let existingUREs = await this.ureService.findCompetitionsUREs(
                compIds,
                Role.SPECTATOR,
                userId
            );
            let ureList: UserRoleEntity[] = [];
            (new Set(compIds)).forEach((compId) => {
                if (existingUREs.filter(ure => (ure.entityId == compId)).length == 0) {
                    let spectatorURE = new UserRoleEntity();
                    spectatorURE.roleId = Role.SPECTATOR;
                    spectatorURE.entityId = compId;
                    spectatorURE.entityTypeId = EntityType.COMPETITION;
                    spectatorURE.userId = userId;
                    spectatorURE.createdBy = createdBy;
                    ureList.push(spectatorURE);
                }
            });
            await this.ureService.batchCreateOrUpdate(ureList);
            this.notifyChangeRole(userId);
        }

        this.firebaseService.sendMessageChunked({
            tokens: deviceIds,
            data: {
                type: 'watchlist_updated'
            }
        });
    }

    @Authorized()
    @Post('/umpireActivity')
    async umpireActivity(
        @QueryParam("userId") userId: number,
        @QueryParam("roleIds") roleIds: number[],
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: "ASC" | "DESC" = undefined,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response
    ) {

        if (userId && isArrayPopulated(roleIds)) {
            return this.rosterService.umpireActivity(userId, roleIds, requestFilter, sortBy, sortOrder);
        } else {
            return response.status(200).send({ name: 'search_error', message: `Invalid parameters` });
        }
    }
}
