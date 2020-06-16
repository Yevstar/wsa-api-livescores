import {Authorized, Body, Get, JsonController, Patch, Post, QueryParam, Res} from 'routing-controllers';
import {MatchUmpire} from '../models/MatchUmpire';
import {Roster} from '../models/security/Roster';
import {Response} from "express";
import {stringTONumber, paginationData, isNotNullAndUndefined, isArrayPopulated} from "../utils/Utils";
import {BaseController} from "./BaseController";
import {RequestFilter} from "../models/RequestFilter";
import {Match} from "../models/Match";
import {logger} from "../logger";
import {StateTimezone} from "../models/StateTimezone";
import {User} from "../models/User";

@JsonController('/matchUmpire')
export class MatchUmpireController extends BaseController {

    @Get('/')
    async find(
        @QueryParam('matchIds') matchIds: number[]
    ): Promise<MatchUmpire[]> {
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

    @Post('/dashboard')
    async getDashboard(
        @QueryParam('organisationId') organisationId: number,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('matchId') matchId: number,
        @QueryParam('divisionId') divisionId: number,
        @QueryParam('venueId') venueId: number,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response
    ): Promise<any> {

        if (organisationId) {
            return await this.matchUmpireService.findByRosterAndCompetition(organisationId, competitionId, matchId, divisionId, venueId, requestFilter);
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields are missing`});
        }
    }

    @Authorized()
    @Post('/')
    async create(
        @QueryParam("matchId", {required: true}) matchId: number,
        @QueryParam("rosterLocked") rosterLocked: boolean,
        @Body({required: true}) umpires: MatchUmpire[],
        @Res() response: Response
    ) {
        /// Checking if the match has already ended
        let match = await this.matchService.findById(matchId);
        if (match && match.matchStatus == 'ENDED') {
            return response.status(400).send({
                name: 'update_error',
                message: 'Game umpires cannot be submitted after a match has ended'
            });
        }
        /// Checking if we have some umpires passed at all
        if (isArrayPopulated(umpires)) {
          /// Checking if match Id are passed to all umpires correctly
          for (let umpire of umpires) {
              if (!umpire.matchId) {
                return response.status(400).send({
                    name: 'create_error',
                    message: `Match ID is required field for umpire ${umpire.user.firstName} ${umpire.user.lastName}`
                });
              }
          }
        } else {
          /// NO umpires data to create
          return response.status(400).send({
              name: 'create_error',
              message: `Umpires provided shouldn't be empty`
          });
        }

        const promises = umpires.map(async umpire => {
            if (umpire.id != null || umpire.id != undefined) {
                let umpireWithDetailsList = await this.matchUmpireService.findByMatchIds([umpire.matchId]);
                if (isArrayPopulated(umpireWithDetailsList)) {
                    let existingUmpire = umpireWithDetailsList[0];

                    let updatedUmpire = new MatchUmpire();
                    updatedUmpire.id = umpire.id;
                    updatedUmpire.matchId = umpire.matchId;
                    updatedUmpire.userId = umpire.userId;
                    updatedUmpire.organisationId = umpire.organisationId;
                    updatedUmpire.umpireName = umpire.umpireName;
                    updatedUmpire.umpireType = umpire.umpireType;
                    updatedUmpire.sequence = umpire.sequence;
                    updatedUmpire.createdBy = umpire.createdBy;
                    updatedUmpire.verifiedBy = umpire.verifiedBy;

                    let savedUmpire = await this.matchUmpireService.createOrUpdate(updatedUmpire);
                    this.updateUmpireRosters(existingUmpire, savedUmpire, rosterLocked);
                    return savedUmpire;
                } else {
                    return await this.createUmpire(umpire, rosterLocked, response);
                }
            } else {
                return await this.createUmpire(umpire, rosterLocked, response);
            }
        });
        await Promise.all(promises);

        return response.status(200).send({ "success" : true});
    }

    private async createUmpire(
        umpire: MatchUmpire,
        rosterLocked: boolean,
        response: Response
    ): Promise<MatchUmpire> {
        let newUmpire = new MatchUmpire();
        newUmpire.matchId = umpire.matchId;
        newUmpire.userId = umpire.userId;
        newUmpire.organisationId = umpire.organisationId;
        newUmpire.umpireName = umpire.umpireName;
        newUmpire.umpireType = umpire.umpireType;
        newUmpire.sequence = umpire.sequence;
        newUmpire.createdBy = umpire.createdBy;
        newUmpire.verifiedBy = umpire.verifiedBy;

        let savedUmpire = await this.matchUmpireService.createOrUpdate(newUmpire);
        this.createUmpireRosters(savedUmpire, rosterLocked);

        let tokens = (await this.deviceService.findScorerDeviceFromRoster(umpire.matchId))
            .map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
            this.firebaseService.sendMessageChunked({
                tokens: tokens,
                    data: {
                        type: 'match_umpires_added',
                        matchId: umpire.matchId.toString(),
                    }
            })
        }

        return savedUmpire;
    }

    private async createUmpireRosters(umpire: MatchUmpire, rosterLocked: boolean) {
      if (umpire.umpireType == "USERS" && umpire.userId) {
          await this.umpireAddRoster(umpire, rosterLocked);
      }
    }

    private async updateUmpireRosters(
        oldUmpire: MatchUmpire,
        newUmpire: MatchUmpire,
        rosterLocked: boolean
    ) {
        let umpireRole = await this.userService.getRole("umpire");

        if (oldUmpire.userId == null && newUmpire.umpireType == "USERS") {
            // Creating new roster for umpire as new user assigned
            this.umpireAddRoster(newUmpire, rosterLocked);
        } else if (oldUmpire.userId && newUmpire.userId && oldUmpire.userId != newUmpire.userId) {
            // A umpire slot got updated to a new user
            // Removing old roster
            this.umpireRemoveRoster(oldUmpire);
            // Creating new roster
            this.umpireAddRoster(newUmpire, rosterLocked);
          } else if (oldUmpire.userId && newUmpire.userId == null) {
            // A umpire got removed
            this.umpireRemoveRoster(oldUmpire);
          }
    }

    private async umpireAddRoster(matchUmpire: MatchUmpire, rosterLocked: boolean) {
      let umpireRole = await this.userService.getRole("umpire");
      let user = await this.userService.findById(matchUmpire.userId);
      let match = await this.matchService.findMatchById(matchUmpire.matchId);

      let umpireRoster = new Roster();
      umpireRoster.roleId = umpireRole;
      umpireRoster.matchId = matchUmpire.matchId;
      umpireRoster.userId = matchUmpire.userId;
      if ((rosterLocked != null || rosterLocked != undefined) && rosterLocked) {
          umpireRoster.locked = rosterLocked;
          umpireRoster.status = "YES";
      }
      let savedRoster = await this.rosterService.createOrUpdate(umpireRoster);
      if (savedRoster) {
        let tokens = (await this.deviceService.getUserDevices(umpireRoster.userId)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
          try {
            if (match.competition && match.competition.location && match.competition.location.id) {
              let stateTimezone: StateTimezone = await this.matchService.getMatchTimezone(match.competition.location);
              let dateOptions = {
                  timeZone: stateTimezone.timezone,
                  year: 'numeric', month: 'numeric', day: 'numeric'
              };
              let timeOptions = {
                  timeZone: stateTimezone.timezone,
                  hour: 'numeric', minute: 'numeric'
              };
              let dateFormatter = new Intl.DateTimeFormat('en-AU', dateOptions);
              let timeFormatter = new Intl.DateTimeFormat('en-AU', timeOptions);

              let matchStartTime = new Date(
                  Date.UTC(match.startTime.getFullYear(),
                      match.startTime.getMonth(),
                      match.startTime.getDate(),
                      match.startTime.getHours(),
                      match.startTime.getMinutes(),
                      match.startTime.getSeconds()
                  )
              );
              let matchDate = dateFormatter.format(matchStartTime);
              let matchTime = timeFormatter.format(matchStartTime);

              let messageBody = '';
              if (rosterLocked) {
                messageBody = `${match.competition.name} has sent you a ` +
                        `new Umpiring Duty for ${matchDate} at ${matchTime}.`;
              } else {
                messageBody = `${match.competition.name} has sent you a ` +
                        `new Umpiring Duty for ${matchDate} at ${matchTime}.` +
                        `Please log into your Netball Live Scores ` +
                        `App to accept/decline.`;
              }
              this.firebaseService.sendMessageChunked({
                  tokens: tokens,
                  title: `Hi ${matchUmpire.umpireName}`,
                  body: messageBody,
                  data: {
                      type: 'add_umpire_match',
                      matchId: savedRoster.matchId.toString(),
                      rosterId: savedRoster.id.toString()
                  }
              });
            }
          } catch (e) {
              logger.error(`Failed to send notification to umpire with error -`, e);
          }
        }
      }
    }

    private async umpireRemoveRoster(matchUmpire: MatchUmpire) {
      let umpireRole = await this.userService.getRole("umpire");
      let roster = await this.rosterService.findByParams(umpireRole.id, matchUmpire.userId, matchUmpire.matchId);
      if (roster) {
          let result = await this.rosterService.delete(roster);
          if (result) {
              let tokens = (await this.deviceService.getUserDevices(matchUmpire.userId)).map(device => device.deviceId);
              if (tokens && tokens.length > 0) {
                  this.firebaseService.sendMessageChunked({
                      tokens: tokens,
                      data: {
                          type: 'remove_umpire_match',
                          rosterId: roster.id.toString(),
                          matchId: roster.matchId.toString()
                      }
                  })
              }
          }
      }
    }
}
