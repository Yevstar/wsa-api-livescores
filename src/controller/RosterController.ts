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
import {stringTONumber, paginationData} from "../utils/Utils";
import {RequestFilter} from "../models/RequestFilter";

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
    async rosterList(
        @QueryParam("competitionId") competitionId: number,
        @QueryParam("roleId") roleId: number,
        @Res() response: Response
    ) {
        if (competitionId && roleId) {
            return this.rosterService.findByRole(competitionId, roleId);
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
    @Post('/')
    async addRoster(@Body() roster: Roster,
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
        return this.rosterService.findRosterId(savedRoster.id);
    }

    @Authorized()
    @Patch('/')
    async updateStatus(
        @HeaderParam("authorization") user: User,
        @QueryParam('rosterId', {required: true}) rosterId: number,
        @QueryParam('status', {required: true}) status: "YES" | "NO" | "LATER" | "MAYBE",
        @Res() response: Response
    ) {
        let roster = await this.rosterService.findFullById(rosterId);
        if (roster) {
            roster.status = status;
            let result = await this.rosterService.createOrUpdate(roster);

            let tokens = (await this.deviceService.findManagerDevice(result.teamId)).map(device => device.deviceId);
            if (tokens && tokens.length > 0) {
                if (status == "NO") {
                    this.firebaseService.sendMessage({
                        tokens: tokens,
                        title: `Scorer declined match: ${roster.match.team1.name} vs ${roster.match.team2.name}`,
                        body: 'Assign someone else to score',
                        data: {
                            type: 'scorer_decline_match', entityTypeId: EntityType.USER.toString(),
                            entityId: user.id.toString(), matchId: roster.matchId.toString()
                        }
                    })
                } else if (status == "YES") {
                    this.firebaseService.sendMessage({
                        tokens: tokens,
                        data: {
                            type: 'scorer_accept_match', entityTypeId: EntityType.USER.toString(),
                            entityId: user.id.toString(), matchId: roster.matchId.toString()
                        }
                    })
                }
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

}

