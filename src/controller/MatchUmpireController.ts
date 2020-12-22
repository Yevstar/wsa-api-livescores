import {Response} from 'express';
import {
    Authorized,
    Body,
    Get,
    JsonController,
    Post,
    QueryParam,
    Res,
    UploadedFile,
    HeaderParam,
} from 'routing-controllers';
import * as fastcsv from 'fast-csv';

import {
    stringTONumber,
    paginationData,
    isNotNullAndUndefined,
    isArrayPopulated,
    arrangeCSVToJson,
    validationForField
} from '../utils/Utils';
import {convertMatchStartTimeByTimezone} from '../utils/TimeFormatterUtils';
import {BaseController} from './BaseController';
import {MatchUmpire} from '../models/MatchUmpire';
import {RequestFilter} from '../models/RequestFilter';
import {EntityType} from '../models/security/EntityType';
import {StateTimezone} from '../models/StateTimezone';
import {User} from '../models/User';
import {Role} from '../models/security/Role';

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
    async findByCompetition(
        @QueryParam('competitionId') competitionId: number,
        @Body() requestFilter: RequestFilter
    ): Promise<any> {
        const resultsFound = await this.matchUmpireService.findByCompetitionId(competitionId, requestFilter);
        if (resultsFound) {
            let responseObject = paginationData(stringTONumber(resultsFound.countObj), requestFilter.paging.limit, requestFilter.paging.offset);
            responseObject['matchUmpires'] = resultsFound.result;
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
        @QueryParam('roundIds') roundIds: number[],
        @QueryParam('sortBy') sortBy: string = undefined,
        @QueryParam('sortOrder') sortOrder: 'ASC' | 'DESC' = undefined,
        @Body() requestFilter: RequestFilter,
        @Res() response: Response
    ): Promise<any> {
        if (organisationId) {
            return await this.matchUmpireService.findByRosterAndCompetition(
                organisationId,
                competitionId,
                matchId,
                divisionId,
                venueId,
                roundIds,
                requestFilter,
                sortBy,
                sortOrder,
            );
        } else {
            return response.status(200).send({
                name: 'search_error',
                message: 'Required fields are missing',
            });
        }
    }

    @Authorized()
    @Post('/')
    async create(
        @QueryParam('matchId', { required: true }) matchId: number,
        @QueryParam('rosterLocked') rosterLocked: boolean,
        @Body({ required: true }) umpires: MatchUmpire[],
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

        let umpireWithDetailsList = await this.matchUmpireService.findByMatchIds([matchId]);
        const promises = umpires.map(async umpire => {
            if (isNotNullAndUndefined(umpire.id)) {
                if (isArrayPopulated(umpireWithDetailsList)) {
                    let existingUmpire = umpireWithDetailsList.find(u => (u.sequence == umpire.sequence));

                    let updatedUmpire = new MatchUmpire();
                    updatedUmpire.id = umpire.id;
                    updatedUmpire.matchId = umpire.matchId;
                    updatedUmpire.userId = umpire.userId;
                    updatedUmpire.competitionOrganisationId = umpire.competitionOrganisationId;
                    updatedUmpire.umpireName = umpire.umpireName;
                    updatedUmpire.umpireType = umpire.umpireType;
                    updatedUmpire.sequence = umpire.sequence;
                    updatedUmpire.createdBy = umpire.createdBy;
                    updatedUmpire.verifiedBy = umpire.verifiedBy;

                    let savedUmpire = await this.matchUmpireService.createOrUpdate(updatedUmpire);
                    await this.updateUmpireRosters(existingUmpire, savedUmpire, rosterLocked);
                    return savedUmpire;
                } else {
                    return await this.createUmpire(umpire, rosterLocked, umpireWithDetailsList, response);
                }
            } else {
                return await this.createUmpire(umpire, rosterLocked, umpireWithDetailsList, response);
            }
        });

        const promisedUmpires = await Promise.all(promises);
        const rosters = await this.rosterService.findAllRostersByParams(
            Role.UMPIRE,
            matchId
        );

        if (isArrayPopulated(promisedUmpires) && isArrayPopulated(rosters)) {
            for (const roster of rosters) {
                let mu = promisedUmpires.filter((matchUmpire) => (
                    matchUmpire.userId == roster.userId
                ))[0];
                if (isNotNullAndUndefined(mu)) {
                    mu.roster = roster;
                }
            }
        }

        return response.status(200).send({
            success: true,
            umpires: promisedUmpires
        });
    }

    private async createUmpire(
        umpire: MatchUmpire,
        rosterLocked: boolean,
        exisitngUmpires: MatchUmpire[],
        response: Response
    ): Promise<MatchUmpire> {
        /// While creating umpire we will be checking if we already have one
        /// existing umpire with same userId for the match. If we found one
        /// then we will remove that first and then create a new one with the
        /// data provided.
        if (isNotNullAndUndefined(exisitngUmpires)) {
            for (let mu of exisitngUmpires) {
                if (mu.userId == umpire.userId && isNotNullAndUndefined(mu.id)) {
                    await this.matchUmpireService.deleteById(mu.id);
                    await this.rosterService.deleteByParams(
                        Role.UMPIRE,
                        mu.userId,
                        mu.matchId
                    );
                }
            }
        }

        let newUmpire = new MatchUmpire();
        newUmpire.matchId = umpire.matchId;
        newUmpire.userId = umpire.userId;
        newUmpire.competitionOrganisationId = umpire.competitionOrganisationId;
        newUmpire.umpireName = umpire.umpireName;
        newUmpire.umpireType = umpire.umpireType;
        newUmpire.sequence = umpire.sequence;
        newUmpire.createdBy = umpire.createdBy;
        newUmpire.verifiedBy = umpire.verifiedBy;

        let savedUmpire = await this.matchUmpireService.createOrUpdate(newUmpire);
        await this.createUmpireRosters(savedUmpire, rosterLocked);

        let tokens = (await this.deviceService.findScorerDeviceFromRoster(umpire.matchId)).map(device => device.deviceId);
        if (tokens && tokens.length > 0) {
            this.firebaseService.sendMessageChunked({
                tokens: tokens,
                data: {
                    type: 'match_umpires_added',
                    matchId: umpire.matchId.toString(),
                },
            });
        }

        return savedUmpire;
    }

    private async createUmpireRosters(umpire: MatchUmpire, rosterLocked: boolean) {
        if (umpire.umpireType == 'USERS' && umpire.userId) {
            await this.umpireAddRoster(
                Role.UMPIRE,
                umpire.matchId,
                umpire.userId,
                umpire.umpireName,
                rosterLocked
            );
        }
    }

    private async updateUmpireRosters(
        oldUmpire: MatchUmpire,
        newUmpire: MatchUmpire,
        rosterLocked: boolean
    ) {
        let umpireRole = await this.userService.getRole('umpire');

        if (oldUmpire.userId == null && newUmpire.umpireType == 'USERS') {
            // Creating new roster for umpire as new user assigned
            await this.umpireAddRoster(
                Role.UMPIRE,
                newUmpire.matchId,
                newUmpire.userId,
                newUmpire.umpireName,
                rosterLocked
            );
        } else if (oldUmpire.userId && newUmpire.userId && oldUmpire.userId != newUmpire.userId) {
            // A umpire slot got updated to a new user
            // Removing old roster
            await this.umpireRemoveRoster(
                Role.UMPIRE,
                oldUmpire.userId,
                oldUmpire.matchId
            );
            // Creating new roster
            await this.umpireAddRoster(
                Role.UMPIRE,
                newUmpire.matchId,
                newUmpire.userId,
                newUmpire.umpireName,
                rosterLocked
            );
        } else if (oldUmpire.userId && newUmpire.userId == null) {
            // A umpire got removed
            await this.umpireRemoveRoster(
                Role.UMPIRE,
                oldUmpire.userId,
                oldUmpire.matchId
            );
        }
    }

    @Authorized()
    @Get('/dashboard/export')
    async exportUmpireDashboard(
        @QueryParam('organisationId') organisationId: number,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('matchId') matchId: number,
        @QueryParam('divisionId') divisionId: number,
        @QueryParam('venueId') venueId: number,
        @QueryParam('roundIds') roundIds: number[],
        @Res() response: Response
    ): Promise<any> {
        if (!organisationId) {
            return response.status(200).send({
                name: 'search_error',
                message: 'Required fields are missing',
            });
        }

        let dict = await this.matchUmpireService.findByRosterAndCompetition(
            organisationId,
            competitionId,
            matchId,
            divisionId,
            venueId,
            roundIds,
            null,
        );

        let competitionTimezone: StateTimezone;
        if (dict.locationId) {
            competitionTimezone = await this.matchService.getMatchTimezone(dict.locationId);
        }

        if (isArrayPopulated(dict.results)) {
            let constants = require('../constants/Constants');

            let venueStateRefIdSet = new Set();
            // Getting all the necessary venue stateRef Ids to get the timezones
            dict.results.map(e => {
                if (isNotNullAndUndefined(e['venueStateRefId'])) {
                    venueStateRefIdSet.add(Number(e['venueStateRefId']));
                }
            });
            let venueTimezoneMap = new Map();
            let venueStateRefIdArray = Array.from(venueStateRefIdSet);
            for (var i = 0; i < venueStateRefIdArray.length; i++) {
                let venueTimeZone = await this.matchService.getMatchTimezone(venueStateRefIdArray[i]);
                venueTimezoneMap[venueStateRefIdArray[i]] = venueTimeZone;
            }

            dict.results.map(e => {
                e['Match ID'] = e['id'];
                if (isNotNullAndUndefined(e['venueStateRefId'])) {
                    e['Start Time'] = convertMatchStartTimeByTimezone(
                        e['startTime'],
                        venueTimezoneMap[Number(e['venueStateRefId'])] != null ? venueTimezoneMap[Number(e['venueStateRefId'])].timezone : null,
                        `${constants.DATE_FORMATTER_KEY} ${constants.TIME_FORMATTER_KEY}`
                    );
                } else {
                    e['Start Time'] = convertMatchStartTimeByTimezone(
                        e['startTime'],
                        competitionTimezone != null ? competitionTimezone.timezone : null,
                        `${constants.DATE_FORMATTER_KEY} ${constants.TIME_FORMATTER_KEY}`
                    );
                }
                e['Home'] = e['team1']['name'];
                e['Away'] = e['team2']['name'];
                e['Round'] = e['round']['name'];
                if (e['umpires'] && e['umpires'][0]) {
                    e['Umpire 1 Id'] = e['umpires'][0]['userId'];
                    e['Umpire 1'] = e['umpires'][0]['umpireName'];
                    e['Umpire 1 Response'] = e['umpires'][0]['status'];
                    const organisationName = [];
                    if (isArrayPopulated(e['umpires'][0]['competitionOrganisations'])) {
                        for (let r of e['umpires'][0]['competitionOrganisations']) {
                            organisationName.push(r['name']);
                        }
                    }
                    e['Umpire 1 Organisation'] = organisationName.toString();
                } else {
                    e['Umpire 1 Id'] = '';
                    e['Umpire 1'] = '';
                    e['Umpire 1 Response'] = '';
                    e['Umpire 1 Organisation'] = '';
                }
                if (e['umpires'] && e['umpires'][1]) {
                    e['Umpire 2 Id'] = e['umpires'][1]['userId'];
                    e['Umpire 2'] = e['umpires'][1]['umpireName'];
                    e['Umpire 2 Response'] = e['umpires'][1]['status'];
                    const organisationName = [];
                    if (isArrayPopulated(e['umpires'][1]['competitionOrganisations'])) {
                        for (let r of e['umpires'][1]['competitionOrganisations']) {
                            organisationName.push(r['name']);
                        }
                    }
                    e['Umpire 2 Organisation'] = organisationName.toString();
                } else {
                    e['Umpire 2 Id'] = '';
                    e['Umpire 2'] = '';
                    e['Umpire 2 Response'] = '';
                    e['Umpire 2 Organisation'] = '';
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
            dict.results.push({
                ['Match ID']: '',
                ['Start Time']: '',
                ['Home']: '',
                ['Away']: '',
                ['Round']: '',
                ['Umpire 1 Id']: '',
                ['Umpire 1']: '',
                ['Umpire 1 Response']: '',
                ['Umpire 1 Organisation']: '',
                ['Umpire 2 Id']: '',
                ['Umpire 2']: '',
                ['Umpire 2 Response']: '',
                ['Umpire 2 Organisation']: ''
            });
        }

        response.setHeader('Content-disposition', 'attachment; filename=match-umpires.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv.write(dict.results, { headers: true })
            .on('finish', function () {
            })
            .pipe(response);
    }

    @Authorized()
    @Post('/dashboard/import')
    async import(
        @HeaderParam('authorization') user: User,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @UploadedFile('file', { required: true }) file: Express.Multer.File,
        @Res() response: Response
    ) {
        const requiredField = [
            'competitionId',
            'Match ID'
        ];

        const bufferString = file.buffer.toString('utf8');
        const data = arrangeCSVToJson(bufferString);
        // const competition = await this.competitionService.findById(competitionId);

        // File columns:
        // Match ID	Start Time	Home	Away	Round
        // Umpire 1 Id	Umpire 1 First Name	Umpire 1 Surname	Umpire 1 Organisation
        // Umpire 2 Id	Umpire 2 First Name	Umpire 2 Surname	Umpire 2 Organisation

        const { result: importArr, message } = validationForField({
            filedList: requiredField,
            values: data,
        });

        const queryArr = [];
        const competitions = {};
        for (let i of importArr) {
            let competition;
            if (!isNotNullAndUndefined(competitions[i['competitionId']])) {
                competition = await this.competitionService.findById(i['competitionId']);
            } else {
                competition = competitions[i['competitionId']];
            }

            if (isNotNullAndUndefined(competition)) {
                competitions[i['competitionId']] = competition;
                let umpire1Imported = false;
                let umpire2Imported = false;

                if (isNotNullAndUndefined(i['Umpire 1 Organisation']) &&
                    ((isNotNullAndUndefined(i['Umpire 1 Id']) && i['Umpire 1 Id'].length > 0) ||
                      (isNotNullAndUndefined(i['Umpire 1']) && i['Umpire 1'].length > 0))) {

                        if (i['Umpire 1 Organisation'].length > 0) {
                          let linkedCompOrgArray = await this.linkedCompetitionOrganisationService
                              .findByNameAndCompetitionId(
                                  i['Umpire 1 Organisation'],
                                  competitionId
                              );

                          if (isArrayPopulated(linkedCompOrgArray)) {
                              const matchUmpire = new MatchUmpire();
                              matchUmpire.matchId = i['Match ID'];
                              matchUmpire.competitionOrganisationId = linkedCompOrgArray[0].id;
                              matchUmpire.umpireType = 'USERS';
                              matchUmpire.sequence = 1;
                              matchUmpire.createdBy = user.id;

                              var rosterStatus;
                              if (isNotNullAndUndefined(i['Umpire 1 Response']) && i['Umpire 1 Response'].length > 0) {
                                  if (i['Umpire 1 Response'] == 1 ||
                                      i['Umpire 1 Response'] == true ||
                                      i['Umpire 1 Response'].toLowerCase() == 'true' ||
                                      i['Umpire 1 Response'].toLowerCase() == 'yes') {
                                        rosterStatus = "YES";
                                  } else if (i['Umpire 1 Response'] == 0 ||
                                      i['Umpire 1 Response'] == false ||
                                      i['Umpire 1 Response'].toLowerCase() == 'false' ||
                                      i['Umpire 1 Response'].toLowerCase() == 'no') {
                                        rosterStatus = "NO";
                                  }
                              }

                              if (isNotNullAndUndefined(i['Umpire 1 Id']) && i['Umpire 1 Id'].length > 0) {
                                  let umpireUser = await this.userService.findById(i['Umpire 1 Id']);
                                  if (isNotNullAndUndefined(umpireUser)) {
                                      matchUmpire.userId = i['Umpire 1 Id'];
                                      matchUmpire.umpireName = `${umpireUser.firstName} ${umpireUser.lastName}`;
                                      await this.matchUmpireService.createOrUpdate(matchUmpire);
                                      await this.umpireAddRoster(
                                          Role.UMPIRE,
                                          matchUmpire.matchId,
                                          matchUmpire.userId,
                                          matchUmpire.umpireName,
                                          false,
                                          rosterStatus
                                      );
                                      queryArr.push(matchUmpire);
                                      umpire1Imported = true;
                                  } else {
                                    if (message[`Line ${i.line}`]) {
                                        if (!message[`Line ${i.line}`].message) {
                                            message[`Line ${i.line}`].message = [];
                                        }
                                    } else {
                                        message[`Line ${i.line}`] = {
                                            message: [],
                                        };
                                    }

                                    message[`Line ${i.line}`].message.push('Could not find a matching Umpire 1 Id.');
                                  }
                              } else if (isNotNullAndUndefined(i['Umpire 1']) && i['Umpire 1'].length > 0) {
                                let fullName = i['Umpire 1'];
                                let userResults = await this.userService.getUserIdBySecurity(
                                    EntityType.COMPETITION_ORGANISATION,
                                    [linkedCompOrgArray[0].id],
                                    fullName,
                                    { roleId: Role.UMPIRE }
                                );
                                if (isArrayPopulated(userResults)) {
                                  matchUmpire.userId = userResults[0].id;
                                  matchUmpire.umpireName = `${userResults[0].firstName} ${userResults[0].lastName}`;
                                  await this.matchUmpireService.createOrUpdate(matchUmpire);
                                  await this.umpireAddRoster(
                                      Role.UMPIRE,
                                      matchUmpire.matchId,
                                      matchUmpire.userId,
                                      matchUmpire.umpireName,
                                      false,
                                      rosterStatus
                                  );
                                  queryArr.push(matchUmpire);
                                  umpire1Imported = true;
                                } else {
                                  if (message[`Line ${i.line}`]) {
                                      if (!message[`Line ${i.line}`].message) {
                                          message[`Line ${i.line}`].message = [];
                                      }
                                  } else {
                                      message[`Line ${i.line}`] = {
                                          message: [],
                                      };
                                  }

                                  message[`Line ${i.line}`].message.push('Could not find a matching Umpire 1.');
                                }
                              }
                          }
                        } else {
                            if (message[`Line ${i.line}`]) {
                                if (!message[`Line ${i.line}`].message) {
                                    message[`Line ${i.line}`].message = [];
                                }
                            } else {
                                message[`Line ${i.line}`] = {
                                    message: [],
                                };
                            }

                            message[`Line ${i.line}`].message.push('Could not find a matching Umpire 1 Organisation.');
                        }
                }

                if (isNotNullAndUndefined(i['Umpire 2 Organisation']) &&
                    ((isNotNullAndUndefined(i['Umpire 2 Id']) && i['Umpire 2 Id'].length > 0) ||
                      (isNotNullAndUndefined(i['Umpire 2']) && i['Umpire 2'].length > 0))) {

                        if (i['Umpire 2 Organisation'].length > 0) {
                          let linkedCompOrgArray = await this.linkedCompetitionOrganisationService
                              .findByNameAndCompetitionId(
                                  i['Umpire 2 Organisation'],
                                  competitionId
                              );

                          if (isArrayPopulated(linkedCompOrgArray)) {
                              const matchUmpire = new MatchUmpire();
                              matchUmpire.matchId = i['Match ID'];
                              matchUmpire.competitionOrganisationId = linkedCompOrgArray[0].id;
                              matchUmpire.umpireType = 'USERS';
                              matchUmpire.sequence = 2;
                              matchUmpire.createdBy = user.id;

                              var rosterStatus;
                              if (isNotNullAndUndefined(i['Umpire 2 Response'])  && i['Umpire 2 Response'].length > 0) {
                                  if (i['Umpire 2 Response'] == 1 ||
                                      i['Umpire 2 Response'] == true ||
                                      i['Umpire 2 Response'].toLowerCase() == 'true' ||
                                      i['Umpire 2 Response'].toLowerCase() == 'yes') {
                                        rosterStatus = "YES";
                                  } else if (i['Umpire 2 Response'] == 0 ||
                                      i['Umpire 2 Response'] == false ||
                                      i['Umpire 2 Response'].toLowerCase() == 'false' ||
                                      i['Umpire 2 Response'].toLowerCase() == 'no') {
                                        rosterStatus = "NO";
                                  }
                              }

                              if (isNotNullAndUndefined(i['Umpire 2 Id']) && i['Umpire 2 Id'].length > 0) {
                                  let umpireUser = await this.userService.findById(i['Umpire 2 Id']);
                                  if (isNotNullAndUndefined(umpireUser)) {
                                      matchUmpire.userId = i['Umpire 2 Id'];
                                      matchUmpire.umpireName = `${umpireUser.firstName} ${umpireUser.lastName}`;
                                      await this.matchUmpireService.createOrUpdate(matchUmpire);
                                      await this.umpireAddRoster(
                                          Role.UMPIRE,
                                          matchUmpire.matchId,
                                          matchUmpire.userId,
                                          matchUmpire.umpireName,
                                          false,
                                          rosterStatus
                                      );
                                      queryArr.push(matchUmpire);
                                      umpire2Imported = true;
                                  } else {
                                    if (message[`Line ${i.line}`]) {
                                        if (!message[`Line ${i.line}`].message) {
                                            message[`Line ${i.line}`].message = [];
                                        }
                                    } else {
                                        message[`Line ${i.line}`] = {
                                            message: [],
                                        };
                                    }

                                    message[`Line ${i.line}`].message.push('Could not find a matching Umpire 2 Id.');
                                  }
                              } else if (isNotNullAndUndefined(i['Umpire 2']) && i['Umpire 2'].length > 0) {
                                let fullName = i['Umpire 2'];
                                let userResults = await this.userService.getUserIdBySecurity(
                                    EntityType.COMPETITION_ORGANISATION,
                                    [linkedCompOrgArray[0].id],
                                    fullName,
                                    { roleId: Role.UMPIRE }
                                );
                                if (isArrayPopulated(userResults)) {
                                  matchUmpire.userId = userResults[0].id;
                                  matchUmpire.umpireName = `${userResults[0].firstName} ${userResults[0].lastName}`;
                                  await this.matchUmpireService.createOrUpdate(matchUmpire);
                                  await this.umpireAddRoster(
                                      Role.UMPIRE,
                                      matchUmpire.matchId,
                                      matchUmpire.userId,
                                      matchUmpire.umpireName,
                                      false,
                                      rosterStatus
                                  );
                                  queryArr.push(matchUmpire);
                                  umpire2Imported = true;
                                } else {
                                  if (message[`Line ${i.line}`]) {
                                      if (!message[`Line ${i.line}`].message) {
                                          message[`Line ${i.line}`].message = [];
                                      }
                                  } else {
                                      message[`Line ${i.line}`] = {
                                          message: [],
                                      };
                                  }

                                  message[`Line ${i.line}`].message.push('Could not find a matching Umpire 2.');
                                }
                              }
                          }
                        } else {
                            if (message[`Line ${i.line}`]) {
                                if (!message[`Line ${i.line}`].message) {
                                    message[`Line ${i.line}`].message = [];
                                }
                            } else {
                                message[`Line ${i.line}`] = {
                                    message: [],
                                };
                            }

                            message[`Line ${i.line}`].message.push('Could not find a matching Umpire 2 Organisation.');
                        }
                }

                if (!umpire1Imported && !umpire2Imported) {
                  if (message[`Line ${i.line}`]) {
                      if (!message[`Line ${i.line}`].message) {
                          message[`Line ${i.line}`].message = [];
                      }
                  } else {
                      message[`Line ${i.line}`] = {
                          message: [],
                      };
                  }

                  message[`Line ${i.line}`].message.push('Missing umpires information/Some information provided is wrong.');
                }
            } else {
                competitions[i['competitionId']] = false;

                if (message[`Line ${i.line}`]) {
                    if (!message[`Line ${i.line}`].message) {
                        message[`Line ${i.line}`].message = [];
                    }
                } else {
                    message[`Line ${i.line}`] = {
                        message: [],
                    };
                }

                message[`Line ${i.line}`].message.push('Could not find a matching competition.');
            }
        }

        const totalCount = data.length;
        const successCount = queryArr.length;
        const failedCount = data.length - successCount;
        const resMsg = `${totalCount} lines processed. ${successCount} lines successfully imported and ${failedCount} lines failed.`;

        return response.status(200).send({
            success: true,
            error: message,
            message: resMsg,
            data: queryArr,
            rawData: data,
        });
    }

    @Authorized()
    @Post('/payments')
    async umpirePayments(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @QueryParam('search') search: string,
        @QueryParam('sortBy') sortBy: string,
        @QueryParam('sortOrder') orderBy: "ASC"|"DESC",
        @Body() requestFilter: RequestFilter
    ) {
        const paymentsData = await this.matchUmpireService.getUmpirePayments(
            competitionId,
            competitionOrganisationId,
            requestFilter,
            search,
            sortBy,
            orderBy
        );
        const OFFSET = requestFilter.paging.offset
        const LIMIT = requestFilter.paging.limit
        if(isNotNullAndUndefined(OFFSET) && isNotNullAndUndefined(LIMIT)) {
            return { page: paginationData(paymentsData.matchCount, LIMIT, OFFSET).page, players: paymentsData.result };
        } else {
            return { page: {}, umpireData: paymentsData.result };
        }
    }

    @Authorized()
    @Get('/payments/export')
    async exportUmpirePayments(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('competitionOrganisationId') competitionOrganisationId: number,
        @QueryParam('search') search: string,
        @QueryParam('sortBy') sortBy: string,
        @QueryParam('sortOrder') orderBy: "ASC" | "DESC",
        @Res() response: Response
    ) {
        if (!isNotNullAndUndefined(competitionId) && !isNotNullAndUndefined(competitionOrganisationId)) {
            return response.status(200).send({ name: 'search_error', message: 'Required fields are missing' });
        }

        let requestFilter = Object.assign({});
        let paging = Object.assign({});
        paging.offset = null;
        paging.limit = null;
        requestFilter.paging = paging;

        let paymentsData = await this.matchUmpireService.getUmpirePayments(
            competitionId,
            competitionOrganisationId,
            requestFilter,
            search,
            sortBy,
            orderBy
        );
        let paymentResult = [];
        const paymentsDup = [...paymentsData.result];
        if (isArrayPopulated(paymentsDup)) {
            paymentResult = paymentsDup.map(e => {
                e['First Name'] = e.user!==null?e.user.firstName:'';
                e['Last Name'] = e.user!==null?e.user.lastName:'';
                e['Match ID'] = e.matchId;
                e['Verified By'] = e.verifiedBy;
                e['Status'] = e.paymentStatus;
                e['Time/Date Paid'] = e.approved_at;
                e['Authoriser'] = (e.approvedByUser !== null ? e.approvedByUser.firstName : '') + ' ' + (e.approvedByUser !== null ? e.approvedByUser.lastName : '');

                delete e.id;
                delete e.matchId;
                delete e.userId;
                delete e.competitionOrganisationId;
                delete e.umpireName;
                delete e.umpireType;
                delete e.sequence;
                delete e.createdBy;
                delete e.verifiedBy;
                delete e.paymentStatus;
                delete e.created_at;
                delete e.paidByOrgId;
                delete e.approved_at;
                delete e.approvedByUserId;
                delete e.updated_at;
                delete e.match;
                delete e.user;
                delete e.approvedByUser;
                return e;
            });
        } else {
            paymentResult.push({
                ['First Name']: 'N/A',
                ['Last Name']: 'N/A',
                ['Match ID']: 'N/A',
                ['Verified By']: 'N/A',
                ['Status']: 'N/A',
                ['Time/Date Paid']: 'N/A',
                ['Authoriser']: 'N/A'
            });
        }

        response.setHeader('Content-disposition', 'attachment; filename=umpirePayments.csv');
        response.setHeader('content-type', 'text/csv');
        fastcsv.write(paymentResult, { headers: true }).on("finish", function () { }).pipe(response);
    }
}
