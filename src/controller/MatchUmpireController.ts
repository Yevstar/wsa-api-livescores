import {Authorized, Body, Get, JsonController, Patch, Post, QueryParam, Res, UploadedFile, HeaderParam} from 'routing-controllers';
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
import * as fastcsv from 'fast-csv';

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

    @Authorized()
    @Get('/dashboard/export')
    async exportTeams(
        @QueryParam('organisationId') organisationId: number,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('matchId') matchId: number,
        @QueryParam('divisionId') divisionId: number,
        @QueryParam('venueId') venueId: number,
        @Res() response: Response): Promise<any> {

        if (!organisationId) {
            return response.status(200).send(
                {name: 'search_error', message: `Required fields are missing`});
        }
        let umpiresList = await this.matchUmpireService.findByRosterAndCompetition(organisationId, competitionId, matchId, divisionId, venueId, null);

        if (isArrayPopulated(umpiresList)) {
            umpiresList.map(e => {
                e['Match ID'] = e['id']
                e['Start Time'] = e['startTime'] // todo date
                e['Home'] = e['team1']['name'];
                e['Away'] = e['team2']['name'];
                e['Round'] = e['round']['name'];
                if (e['umpires'] && e['umpires'][0]) {
                    e['Umpire 1 Id'] = e['umpires'][0]['userId'];
                    e['Umpire 1'] = e['umpires'][0]['umpireName'];
                    e['Umpire 2 Organisation'] = e['umpires'][0]['status'];
                    const organisationName = [];
                    if (isArrayPopulated(e['umpires'][0]['organisations'])) {
                        for (let r of e['umpires'][0]['organisations']) {
                            organisationName.push(r['name']);
                        }
                    }
                    e['Organisation 1 Name'] = organisationName.toString().replace(",", '\n');
                }
                if (e['umpires'] && e['umpires'][1]) {
                    e['Umpire 2 Id'] = e['umpires'][1]['userId'];
                    e['Umpire 2'] = e['umpires'][1]['umpireName'];
                    e['Umpire 2 Response'] = e['umpires'][1]['status'];
                    const organisationName = [];
                    if (isArrayPopulated(e['umpires'][1]['organisations'])) {
                        for (let r of e['umpires'][1]['organisations']) {
                            organisationName.push(r['name']);
                        }
                    }
                    e['Umpire 2 Organisation'] = organisationName.toString().replace(",", '\n');
                }
                delete e['id'];
                delete e['startTime'];
                delete e['team1'];
                delete e['team2'];
                delete e['round'];
                delete e['umpires'];
                return e;
            });
        } else {
            umpiresList.push({
                ['Match Id']: 'N/A',
                ['Start Time']: 'N/A',
                ['Home']: 'N/A',
                ['Away']: 'N/A',
                ['Round']: 'N/A',
                ['Umpire 1 Id']: 'N/A',
                ['Umpire 1']: 'N/A',
                ['Umpire 1 Organisation']: 'N/A',
                ['Umpire 2 Id']: 'N/A',
                ['Umpire 2']: 'N/A',
                ['Umpire 2 Organisation']: 'N/A'
            });
        }

        response.setHeader('Content-disposition', 'attachment; filename=teams.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv.write(umpiresList, { headers: true })
            .on("finish", function () { })
            .pipe(response);
    }

    @Authorized()
    @Post('/dashboard/import')
    async import(
        @HeaderParam("authorization") user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @UploadedFile("file", { required: true }) file: Express.Multer.File,
        @Res() response: Response) 
    {
        let bufferString = file.buffer.toString('utf8');
        let arr = bufferString.split('\n');
        let jsonObj = [];
        let headers = arr[0].split(',');
        const infoMisMatchArray: any = [];
        let importSuccess: boolean = false;

        // File columns:
        //Match ID	Start Time	Home	Away	Round 	
        //Umpire 1 Id	Umpire 1 First Name	Umpire 1 Surname	Umpire 1 Organisation
        //Umpire 2 Id	Umpire 2 First Name	Umpire 2 Surname	Umpire 2 Organisation

        for (let i = 1; i < arr.length; i++) {
            let data = arr[i].split(',');
            let obj = {};
            for (let j = 0; j < data.length; j++) {
                if (headers[j] !== undefined) obj[headers[j].trim()] = data[j].trim();
            }
            jsonObj.push(obj);
        }
        if (isArrayPopulated(jsonObj)) {
            for (let i of jsonObj) {
                if (isNotNullAndUndefined(i['Match ID']) && (i['Match ID'] != '') &&
                    isNotNullAndUndefined(i['Umpire 1 Id']) && (i['Umpire 1 Id'] != '')
                ) {
                        
                    const matchUmpire1 = new MatchUmpire();
                    matchUmpire1.matchId = i['Match ID'];
                    matchUmpire1.userId = i['Umpire 1 Id'];
                    await this.umpireAddRoster(matchUmpire1, false);

                    if (isNotNullAndUndefined(i['Match ID']) && (i['Match ID'] != '') &&
                    isNotNullAndUndefined(i['Umpire 1 Id']) && (i['Umpire 1 Id'] != '')
                    ) {
                        const matchUmpire2 = new MatchUmpire();
                        matchUmpire2.matchId = i['Match ID'];
                        matchUmpire2.userId = i['Umpire 2 Id'];
                        await this.umpireAddRoster(matchUmpire2, false);
                    }
                    importSuccess = true;
                }
            }

            if (importSuccess) {
                return response.status(200).send({ success: true });
            } else {
                return response.status(212).send(`Required parameters were not filled within the file provided for importing`);
            }
        }
    }

    
}
