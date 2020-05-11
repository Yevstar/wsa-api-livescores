import {Authorized, Body, Get, JsonController, Patch, Post, QueryParam, Res, HeaderParam} from 'routing-controllers';
import {MatchUmpires} from '../models/MatchUmpires';
import {Roster} from '../models/security/Roster';
import {Response} from "express";
import {stringTONumber, paginationData} from "../utils/Utils";
import {BaseController} from "./BaseController";
import {RequestFilter} from "../models/RequestFilter";
import {Match} from "../models/Match";
import {logger} from "../logger";
import {StateTimezone} from "../models/StateTimezone";
import {User} from "../models/User";

@Authorized()
@JsonController('/matchUmpires')
export class MatchUmpiresController extends BaseController {

    @Get('/')
    async find(
        @QueryParam('matchIds') matchIds: number[]
    ): Promise<MatchUmpires[]> {
        return this.matchUmpiresService.findByMatchIds(matchIds);
    }

    @Authorized()
    @Post('/admin')
    async findbyCompetition(
        @QueryParam('competitionId') competitionId: number,
        @Body() requestFilter: RequestFilter
    ): Promise<any> {

        const resultsFound = await this.matchUmpiresService.findByCompetitionId(competitionId, requestFilter);
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
        @QueryParam('recordUmpireType') recordUmpireType: "NAMES" | "USERS",
        @Body({required: true}) matchUmpires: MatchUmpires,
        @Res() response: Response) {
        if (matchUmpires.id) {
            let umpires = await this.matchUmpiresService.getById(matchUmpires.id);
            if (umpires) {
                if (umpires.match && umpires.match.matchStatus == 'ENDED') {
                    return response.status(400).send({
                        name: 'update_error',
                        message: 'Game umpires cannot be submitted after a match has ended'
                    });
                }
                let savedUmpires = await this.matchUmpiresService.createOrUpdate(matchUmpires);
                await this.updateUmpireRosters(recordUmpireType, umpires, savedUmpires);
                return savedUmpires;
            } else {
                return await this.createUmpire(matchUmpires, recordUmpireType, response);
            }
        } else {
            return await this.createUmpire(matchUmpires, recordUmpireType, response);
        }
    }

    private async createUmpire(matchUmpires, recordUmpireType: "NAMES" | "USERS", response) {
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
            let count = await this.matchUmpiresService.count(matchId)
            if (count == 0) {
                let umpires = await this.matchUmpiresService.createOrUpdate(matchUmpires);
                await this.createUmpireRosters(matchUmpires, matchId, recordUmpireType);
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

    private async createUmpireRosters(matchUmpires, matchId, recordUmpireType: "NAMES" | "USERS") {
      if (recordUmpireType == "USERS") {
        for (let i = 0; i < 3; i++) {
          let userId;
          let userName;
          switch (i) {
            case 0:
                userId = matchUmpires.umpire1UserId;
                userName = matchUmpires.umpire1FullName;
            break;
            case 1:
                userId = matchUmpires.umpire2UserId;
                userName = matchUmpires.umpire2FullName;
            break;
            case 2:
                userId = matchUmpires.umpire3UserId;
                userName = matchUmpires.umpire3FullName;
            break;
          }

          if (userId) {
              await this.umpireAddRoster(matchUmpires, matchId, userId, userName);
          }
        }
      }
    }

    private async updateUmpireRosters(
        recordUmpireType: "NAMES" | "USERS",
        oldMatchUmpires: MatchUmpires,
        newMatchUmpires: MatchUmpires
    ) {
      if (recordUmpireType == "USERS") {
        let umpireRole = await this.userService.getRole("umpire");

        for (let i = 0; i < 3; i++) {
          let oldUserId;
          let newUserId;
          let userName;
          switch (i) {
            case 0:
                oldUserId = oldMatchUmpires.umpire1UserId;
                newUserId = newMatchUmpires.umpire1UserId;
                userName = newMatchUmpires.umpire1FullName;
            break;
            case 1:
                oldUserId = oldMatchUmpires.umpire2UserId;
                newUserId = newMatchUmpires.umpire2UserId;
                userName = newMatchUmpires.umpire2FullName;
            break;
            case 2:
                oldUserId = oldMatchUmpires.umpire3UserId;
                newUserId = newMatchUmpires.umpire3UserId;
                userName = newMatchUmpires.umpire3FullName;
            break;
          }

          if (oldUserId == null && newUserId) {
              // Creating new roster for umpire as new user assigned
              await this.umpireAddRoster(newMatchUmpires, oldMatchUmpires.match.id, newUserId, userName);
          } else if (oldUserId && newUserId && oldUserId != newUserId) {
            // A umpire slot got updated to a new user
            // Removing old roster
            await this.umpireRemoveRoster(oldMatchUmpires, oldUserId);
            // Creating new roster
            await this.umpireAddRoster(newMatchUmpires, oldMatchUmpires.match.id, newUserId, userName);
          } else if (oldUserId && newUserId == null) {
            // A umpire got removed
            await this.umpireRemoveRoster(oldMatchUmpires, oldUserId);
          }
        }
      }
    }

    private async umpireAddRoster(
      matchUmpires: MatchUmpires,
      matchId: number,
      userId: number,
      userName: string
    ) {
      let umpireRole = await this.userService.getRole("umpire");
      let user = await this.userService.findById(userId);
      let match = await this.matchService.findMatchById(matchId);

      let umpireRoster = new Roster();
      umpireRoster.roleId = umpireRole;
      umpireRoster.matchId = matchUmpires.matchId;
      umpireRoster.userId = userId;
      let savedRoster = await this.rosterService.createOrUpdate(umpireRoster);
      if (savedRoster) {
        let tokens = (await this.deviceService.getUserDevices(userId)).map(device => device.deviceId);
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

              this.firebaseService.sendMessageChunked({
                  tokens: tokens,
                  title: `Hi ${userName}`,
                  body: `${match.competition.name} has sent you a ` +
                          `new Umpiring Duty for ${matchDate} at ${matchTime}.` +
                          `Please log into your Netball Live Scores ` +
                          `App to accept/decline.`,
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

    private async umpireRemoveRoster(matchUmpires: MatchUmpires, userId: number) {
      let umpireRole = await this.userService.getRole("umpire");
      let roster = await this.rosterService.findByParams(umpireRole.id, userId, matchUmpires.matchId);
      if (roster) {
          let result = await this.rosterService.delete(roster);
          if (result) {
              let tokens = (await this.deviceService.getUserDevices(userId)).map(device => device.deviceId);
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
