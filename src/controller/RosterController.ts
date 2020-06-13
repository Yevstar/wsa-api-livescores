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
import {Roster} from "../models/security/Roster";
import {Response} from "express";
import {BaseController} from "./BaseController";
import {EntityType} from "../models/security/EntityType";
import {User} from "../models/User";
import {stringTONumber, paginationData, isArrayPopulated} from "../utils/Utils";
import {RequestFilter} from "../models/RequestFilter";
import * as fastcsv from 'fast-csv';

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
                name: 'search_error', message: `Invalid parameters`
            });
        }
    }

    @Authorized()
    @Post('/list')
    async rosterList(
        @QueryParam("competitionId") competitionId: number,
        @QueryParam("roleId") roleId: number,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response
    ) {
        if (competitionId && roleId) {
            return this.rosterService.findUserRostersByCompetition(competitionId, roleId, requestFilter);
        } else {
            return response.status(200).send({
                name: 'search_error', message: `Invalid parameters`
            });
        }
    }

    @Authorized()
    @Post('/admin')
    async rosterListAdmin(
        @QueryParam("competitionId") competitionId: number,
        @QueryParam("roleId") roleId: number,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response
    ) {
        if (competitionId && roleId) {
            return this.rosterService.findByCompetitionId(competitionId, roleId, requestFilter);
        } else {
            return response.status(200).send({
                name: 'search_error', message: `Invalid parameters`
            });
        }
    }

    @Authorized()
    @Delete('/')
    async delete(@QueryParam("id") id: number, @Res() response: Response) {
        //TODO: Add back in assign_scorer authorisation
        let roster = await this.rosterService.findById(id);
        if (roster) {
            let tokens = (await this.deviceService.findScorerDeviceFromRoster(undefined, id)).map(device => device.deviceId);
            let result = await this.rosterService.delete(roster);
            if (result) {
                if (tokens && tokens.length > 0) {
                    this.firebaseService.sendMessageChunked({
                        tokens: tokens,
                        data: {
                            type: 'remove_scorer_match',
                            rosterId: id.toString(),
                            matchId: roster.matchId.toString()
                        }
                    })
                }
                return response.status(200).send({delete: true});
            } else {
                return response.status(200).send({delete: false});
            }
        } else {
            return response.status(200).send({delete: false});
        }
    }

    @Authorized()
    @Get('/')
    async findByUser(@HeaderParam("authorization") user: User): Promise<Roster[]> {
        return this.rosterService.findByUser(user.id);
    }

    @Authorized()
    @Get('/match')
    async findByMatchId(@QueryParam('ids') matchIds: number[] = [],
                        @Res() response: Response) {
        if (!matchIds || matchIds.length == 0) {
            return response
                .status(400).send({name: 'validation_error', message: 'Match id`s required.'});
        }
        return this.rosterService.findByMatchIds(matchIds);
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
      @QueryParam('category', {required: true}) category: "Scoring" | "Playing" | "Event" | "Umpiring",
      @Res() response: Response
    ) {
        if (!roster) {
            return response
                .status(400).send({name: 'validation_error', message: 'Roster in body required.'});
        }
        let savedRoster = await this.rosterService.createOrUpdate(roster);
        if (savedRoster) {
            switch (category) {
              case "Scoring":
                let scoringDeviceTokens = (await this.deviceService.findManagerDevice(roster.teamId)).map(device => device.deviceId);
                if (scoringDeviceTokens && scoringDeviceTokens.length > 0) {
                    this.firebaseService.sendMessage({
                      tokens: scoringDeviceTokens,
                      data: {type: 'add_scorer_match', rosterId: roster.id.toString(),
                        matchId: roster.matchId.toString()}
                    });
                }
                break;
              case "Playing":
                let playingDeviceTokens = (await this.deviceService.findManagerDevice(roster.teamId)).map(device => device.deviceId);
                if (playingDeviceTokens && playingDeviceTokens.length > 0) {
                    this.firebaseService.sendMessage({
                      tokens: playingDeviceTokens,
                      data: {type: 'player_status_update', entityTypeId: EntityType.USER.toString(),
                      entityId: user.id.toString(), matchId: roster.matchId.toString()}
                    });
                }
                break;
              case "Event":
                let eventDeviceTokens = (await this.deviceService.getUserDevices(roster.eventOccurrence.created_by)).map(device => device.deviceId);
                if (eventDeviceTokens && eventDeviceTokens.length > 0) {
                    this.firebaseService.sendMessage({
                      tokens: eventDeviceTokens,
                      data: {
                        type: 'event_invitee_update', entityTypeId: EntityType.USER.toString(),
                        entityId: user.id.toString(), eventOccurrenceId: roster.eventOccurrenceId.toString()
                      }
                    });
                }
                break;
            }

            return savedRoster;
        } else {
          return response.status(400).send({
              name: 'save_error', message: `Sorry, unable to save the roster`
          });
        }
    }

    @Authorized()
    @Patch('/')
    async updateStatus(
        @HeaderParam("authorization") user: User,
        @QueryParam('rosterId', {required: true}) rosterId: number,
        @QueryParam('status', {required: true}) status: "YES" | "NO" | "LATER" | "MAYBE",
        @QueryParam('category', {required: true}) category: "Scoring" | "Playing" | "Event" | "Umpiring",
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
                          this.firebaseService.sendMessage({
                              tokens: scoringDeviceTokens,
                              title: `Scorer declined match: ${roster.match.team1.name} vs ${roster.match.team2.name}`,
                              body: 'Assign someone else to score',
                              data: {
                                  type: 'scorer_decline_match', entityTypeId: EntityType.USER.toString(),
                                  entityId: user.id.toString(), matchId: roster.matchId.toString()
                              }
                          });
                      } else if (status == "YES") {
                          this.firebaseService.sendMessage({
                              tokens: scoringDeviceTokens,
                              data: {
                                  type: 'scorer_accept_match', entityTypeId: EntityType.USER.toString(),
                                  entityId: user.id.toString(), matchId: roster.matchId.toString()
                              }
                          });
                      }
                  }
                break;
              case "Playing":
                let playingDeviceTokens = (await this.deviceService.findManagerDevice(roster.teamId)).map(device => device.deviceId);
                if (playingDeviceTokens && playingDeviceTokens.length > 0) {
                    this.firebaseService.sendMessage({
                        tokens: playingDeviceTokens,
                        data: {
                          type: 'player_status_update', entityTypeId: EntityType.USER.toString(),
                          entityId: user.id.toString(), matchId: roster.matchId.toString()
                        }
                    });
                }
                break;
              case "Event":
                  let eventDeviceTokens = (await this.deviceService.getUserDevices(roster.eventOccurrence.created_by)).map(device => device.deviceId);
                  if (eventDeviceTokens && eventDeviceTokens.length > 0) {
                      this.firebaseService.sendMessage({
                        tokens: eventDeviceTokens,
                        data: {
                          type: 'event_invitee_update', entityTypeId: EntityType.USER.toString(),
                          entityId: user.id.toString(), eventOccurrenceId: roster.eventOccurrenceId.toString()
                        }
                      });
                  }
                break;
                case "Umpiring":
                    let umpireDeviceTokens = (await this.deviceService.findManagerDevice(result.teamId)).map(device => device.deviceId);
                    if (umpireDeviceTokens && umpireDeviceTokens.length > 0) {
                        if (status == "NO") {
                            this.firebaseService.sendMessage({
                                tokens: umpireDeviceTokens,
                                data: {
                                    type: 'umpire_decline_match', entityTypeId: EntityType.USER.toString(),
                                    entityId: user.id.toString(), matchId: roster.matchId.toString()
                                }
                            });
                        } else if (status == "YES") {
                            this.firebaseService.sendMessage({
                                tokens: umpireDeviceTokens,
                                data: {
                                    type: 'umpire_accept_match', entityTypeId: EntityType.USER.toString(),
                                    entityId: user.id.toString(), matchId: roster.matchId.toString()
                                }
                            });
                        }
                    }
                  break;
            }

            return result;
        } else {
            return response.status(404).send({
                name: 'search_error', message: `Roster with id [${rosterId}] not found`
            });
        }
    }

    @Post("/broadcast")
    async broadcastRoster(
        @QueryParam("userId", {required: true}) userId: number,
        @Res() response: Response
    ) {
        let tokens = (await this.deviceService.getUserDevices(userId)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
            this.firebaseService.sendMessage({
                tokens: tokens,
                data: {
                    type: 'update_scorer_roster'
                }
            })
        }
        return response.status(200).send({success: true});
    }

    // specific response to allow inline editing for admin
    @Authorized()
    @Post('/admin/assign')
    async addAdminRoster(@Body() roster: Roster,
                    @Res() response: Response) {
        if (!roster) {
            return response
                .status(400).send({name: 'validation_error', message: 'Roster in body required.'});
        }
        let savedRoster = await this.rosterService.createOrUpdate(roster);
        if (savedRoster) {
            let tokens = (await this.deviceService.getUserDevices(savedRoster.userId)).map(device => device.deviceId);
            if (tokens && tokens.length > 0) {
                this.firebaseService.sendMessage({
                    tokens: tokens,
                    data: {type: 'add_scorer_match', rosterId: roster.id.toString(), matchId: roster.matchId.toString()}
                })
            }
        }
        return this.rosterService.findAdminRosterId(savedRoster.id);
    }

    // specific response to allow inline editing for admin
    @Authorized()
    @Delete('/admin')
    async deleteAdminRoster(@QueryParam("id") id: number, @Res() response: Response) {
        let roster = await this.rosterService.findById(id);
        if (roster) {
            let tokens = (await this.deviceService.findScorerDeviceFromRoster(undefined, id)).map(device => device.deviceId);
            let result = await this.rosterService.delete(roster);
            if (result) {
                if (tokens && tokens.length > 0) {
                    this.firebaseService.sendMessageChunked({
                        tokens: tokens,
                        data: {
                            type: 'remove_scorer_match',
                            rosterId: id.toString(),
                            matchId: roster.matchId.toString()
                        }
                    })
                }
                return response.status(200).send();
            } else {
                return response.status(200).send({delete: false});
            }
        } else {
            return response.status(200).send({delete: false});
        }
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
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('roleId') roleId: number,
        @Res() response: Response): Promise<any> {
        const requestFilter: RequestFilter = { paging: { offset: null, limit: null }, search: null };

        if (competitionId && roleId) {
            const getScorersData = await this.rosterService.findByCompetitionId(competitionId, roleId, requestFilter);

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
                .on("finish", function () { })
                .pipe(response);
        } else {
            return response.status(212).send({
                name: 'parameter_required', message: `Invalid parameters passed`
            });
        }
    }
}
