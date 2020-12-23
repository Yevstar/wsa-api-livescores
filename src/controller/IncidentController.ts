import {Get,
    JsonController,
    QueryParam,
    Param,
    Authorized,
    Res,
    Post,
    Patch,
    HeaderParam,
    UploadedFiles,
    Body
} from "routing-controllers";
import * as fastcsv from 'fast-csv';
import {Response} from "express";

import {BaseController} from "./BaseController";
import {Incident} from "../models/Incident";
import {IncidentPlayer} from "../models/IncidentPlayer";
import {IncidentMedia} from "../models/IncidentMedia";
import {
    fileExt,
    isPhoto,
    isVideo,
    timestamp,
    stringTONumber,
    paginationData,
    isNotNullAndUndefined,
    isArrayPopulated
} from "../utils/Utils";
import {logger} from "../logger";
import {User} from "../models/User";
import {Competition} from "../models/Competition";
import {convertMatchStartTimeByTimezone} from '../utils/TimeFormatterUtils';

@JsonController("/incident")
export class IncidentController extends BaseController {

    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.incidentService.findById(id);
    }

    @Authorized()
    @Get('/')
    async find(
        @QueryParam("incidentId") incidentId: number,
        @QueryParam("entityId") entityId: number,
        @QueryParam("entityTypeId") entityTypeId: number,
        @QueryParam("offset") offset: number,
        @QueryParam("limit") limit: number,
        @QueryParam("sortBy") sortBy: string = undefined,
        @QueryParam("sortOrder") sortOrder: "ASC"|"DESC" = undefined,
        @QueryParam("search") search: string,
        @Res() response: Response
    ) {
        if (isNotNullAndUndefined(incidentId) ||
            (isNotNullAndUndefined(entityId) && isNotNullAndUndefined(entityTypeId))) {
                const incidentData = await this.incidentService.findByParams(
                    incidentId,
                    entityId,
                    entityTypeId,
                    offset,
                    limit,
                    search,
                    sortBy,
                    sortOrder
                );
                if (incidentData && isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit)) {
                    let responseObject = paginationData(stringTONumber(incidentData.count), limit, offset)
                    responseObject["incidents"] = incidentData.results;
                    return responseObject;
                } else {
                    return incidentData.results;
                }
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Required parameters not filled`});
        }
    }

    @Authorized()
    @Get('/match')
    async loadIncidents(
        @QueryParam('matchId') matchId: number,
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('teamId', {required: true}) teamId: number,
        @QueryParam('playerId', {required: true}) playerId: number,
        @QueryParam('incidentTypeId') incidentTypeId: number,
        @Res() response: Response) {
        return this.incidentService.findIncidentsByParam(matchId, competitionId, teamId, playerId, incidentTypeId);
    }

    @Authorized()
    @Post('/')
    async addIncident(
        @QueryParam('playerIds', {required: true}) playerIds: number[] = undefined,
        @Body() incident: Incident,
        @Res() response: Response
    ) {
        return await this.addOrEditIncident(
            false,
            playerIds,
            incident,
            response
        );
    }

    private async addOrEditIncident(
        isEdit: boolean,
        playerIds: number[],
        incident: Incident,
        response: Response
    ) {
      try {
          if (incident) {
              if (!isEdit && incident.id) {
                  return response.status(400).send({
                      name: 'validation_error',
                      message: `Update incident not supported`
                  });
              } else if (isEdit && !incident.id) {
                  return response.status(400).send({
                      name: 'validation_error',
                      message: `Incident id not provided`
                  });
              }

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
              /// Save or Update incident provided
              const result = await this.incidentService.createOrUpdate(incident);
              /// Update incident media with incident id if any
              await this.updateMediaIncidentId(result);

              // If edit then need to clear incident player list
              if (isEdit) {
                  await this.incidentService.deleteIncidentPlayers(incident.id);
              }
              // save player incidents
              let save: IncidentPlayer[] = [];
              if (playerIds && !Array.isArray(playerIds)) playerIds = [playerIds];
              for (const playerId of playerIds) {
                  save.push(new IncidentPlayer(playerId, result.id));
              }
              await this.incidentService.batchSavePlayersIncident(save);

              return response.status(200).send({success: true, incidentId: result.id});
          } else {
              return response.status(400).send(
                  {name: 'validation_error', message: `Incident can not be null`});
          }
      } catch (e) {
          logger.error(`Failed to create incident`, e);
          return response.status(400).send({
              name: 'validation_error',
              message: isEdit ? 'Failed to edit incident' : 'Failed to create incident'
          });
      }
    }

    @Authorized()
    @Patch('/edit')
    async editIncident(
        @QueryParam('playerIds', {required: true}) playerIds: number[] = undefined,
        @Body() incident: Incident,
        @Res() response: Response
    ) {
        return await this.addOrEditIncident(
            true,
            playerIds,
            incident,
            response
        );
    }

    @Authorized()
    @Post('/media')
    async addIncidentMedia(
        @HeaderParam("authorization") user: User,
        @QueryParam("incidentId") incidentId: number,
        @QueryParam("guid") guid: string,
        @UploadedFiles("media", {required: true}) files: Express.Multer.File[],
        @Res() response: Response
    ) {
        // if (!files || files.length == 0) {
        //     return response.status(400).send({
        //         success: false,
        //         name: 'upload_error',
        //         message: `Incident media required`
        //     });
        // }

        let mediaCount = await this.incidentService.mediaCount(incidentId, guid);
        if (mediaCount > 0) {
            return response.status(400).send({
                success: false,
                name: 'upload_error',
                message: `Some media already exists for this incident`
            });
        }

        return await this.uploadOrRemoveIncidentMedia(
            user,
            incidentId,
            guid,
            files,
            [],
            response
        );
    }

    private async uploadOrRemoveIncidentMedia(
      user: User,
      incidentId: number,
      guid: string,
      files: Express.Multer.File[],
      incidentMediaIds: number[],
      @Res() response: Response
    ) {
        if (!incidentId && !guid) {
            return response.status(400).send({
                success: false,
                name: 'upload_error',
                message: `Incident id or guid parameter data required`
            });
        }

        try {
            var removedIncidentMediaArray: IncidentMedia[];
            if (incidentMediaIds && incidentMediaIds.length >= 0) {
                /// If there are some incident media ids then we need to keep
                /// those media and remove others existing for that incident id
                removedIncidentMediaArray = (await this.incidentService.fetchIncidentMedia(incidentId, guid))
                    .filter(incidentMedia => (incidentMediaIds.indexOf(incidentMedia.id) === -1));
            } else if (!incidentMediaIds) {
                /// If no media ids provided then remove all the existing media
                removedIncidentMediaArray = await this.incidentService.fetchIncidentMedia(incidentId, guid);
            }
            /// Process removal of media if any in the list and also
            /// remove db entry in the incident media
            if (removedIncidentMediaArray && removedIncidentMediaArray.length > 0) {
                const mediaRemovalPromises = [];
                removedIncidentMediaArray.forEach(async incidentMedia => {
                    if (incidentMedia.mediaUrl) {
                        var filepath = incidentMedia.mediaUrl.split("/incidents%2F").pop();
                        const nameSplit = filepath.split('?generation=');
                        filepath = nameSplit[0];
                        this.firebaseService.removeMedia(`/incidents/${filepath}`);

                        mediaRemovalPromises.push(
                            this.incidentService.removeIncidentMedia(incidentMedia)
                        );
                    }
                });
                await Promise.all(mediaRemovalPromises);
            }

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
                    let filename = `/incidents/u${user.id}_${timestamp()}.${fileExt(file.originalname)}`;
                    let upload = await this.firebaseService.upload(filename, file);
                    if (upload) {
                        var url = `${upload['url']}`;
                        const altMedia: string = 'alt=media';
                        if (!url.includes(altMedia)) {
                           if (url.includes('?')) {
                              url = `${url}&${altMedia}`
                           } else {
                              url = `${url}?${altMedia}`
                           }
                        }
                        media.push(this.incidentService.createIncidentMedia(incidentId, guid, user.id, url, file.mimetype));
                        result.push({file: file.originalname, success: true})
                    } else {
                        result.push({file: file.originalname, success: false})
                    }
                }
                await this.incidentService.saveIncidentMedia(media);
                /// Update incident media with incident id if any
                if (guid) {
                    const incident = await this.incidentService.fetchIncidentByGUID(guid);
                    await this.updateMediaIncidentId(incident);
                }

                return response.status(200).send({success: true, data: result});
            }
        } catch (e) {
            logger.error(`Failed to create incident media`, e);
            return response.status(400).send({
                success: false,
                name: 'upload_error',
                message: `Failed to upload incident media, due to ${e}`
            });
        }

        return response.status(200).send({success: true});
    }

    @Authorized()
    @Patch('/media/edit')
    async editIncidentMedia(
        @HeaderParam("authorization") user: User,
        @QueryParam("incidentId") incidentId: number,
        @QueryParam("guid") guid: string,
        @QueryParam("incidentMediaIds") incidentMediaIds: number[],
        @UploadedFiles("media") files: Express.Multer.File[],
        @Res() response: Response
    ) {
        return await this.uploadOrRemoveIncidentMedia(
            user,
            incidentId,
            guid,
            files,
            incidentMediaIds,
            response
        );
    }

    private async updateMediaIncidentId(incident: Incident) {
        let incidentMediaList = await this.incidentService.fetchIncidentMedia(incident.id, incident.guid);
        let incidentMediaArray: IncidentMedia[] = [];
        for (const incidentMedia of incidentMediaList) {
            if (incidentMedia.incidentId != incident.id) {
              incidentMedia.incidentId = incident.id;
              incidentMediaArray.push(incidentMedia);
            }
        }
        await this.incidentService.batchSaveIncidentMedia(incidentMediaArray);
    }

    @Authorized()
    @Get('/export')
    async exportIncidents(
        @QueryParam("incidentId") incidentId: number,
        @QueryParam("entityId") entityId: number,
        @QueryParam("entityTypeId") entityTypeId: number,
        @QueryParam("sortBy") sortBy: string = undefined,
        @QueryParam("sortOrder") sortOrder: "ASC"|"DESC" = undefined,
        @QueryParam("search") search: string,
        @Res() response: Response
    ): Promise<any> {
      if (isNotNullAndUndefined(incidentId) ||
          (isNotNullAndUndefined(entityId) && isNotNullAndUndefined(entityTypeId))) {
            const incidentData = await this.incidentService.findByParams(
                incidentId,
                entityId,
                entityTypeId,
                null,
                null,
                search,
                sortBy,
                sortOrder
            );

            if (isArrayPopulated(incidentData.results)) {
                let constants = require('../constants/Constants');

                let locationIdsSet = new Set();
                // Getting all the necessary competition Ids to get the timezones
                incidentData.results.map(incident => {
                    if (isNotNullAndUndefined(incident['match']['venueCourt']['venue']['stateRefId'])) {
                        locationIdsSet.add(Number(incident['match']['venueCourt']['venue']['stateRefId']));
                    } else {
                        locationIdsSet.add(Number(incident['competition']['locationId']));
                    }
                });
                let locationsTimezoneMap = new Map();
                let locationIdsArray = Array.from(locationIdsSet);
                for (var i = 0; i < locationIdsArray.length; i++) {
                    let locationTimeZone = await this.matchService.getMatchTimezone(locationIdsArray[i]);
                    locationsTimezoneMap[locationIdsArray[i]] = locationTimeZone;
                }

                incidentData.results.map(incident => {
                    var locationId;
                    if (isNotNullAndUndefined(incident['match']['venueCourt']['venue']['stateRefId'])) {
                        locationId = Number(incident['match']['venueCourt']['venue']['stateRefId']);
                    } else {
                        locationId = Number(incident['competition']['locationId']);
                    }
                    incident['Date'] = convertMatchStartTimeByTimezone(
                        incident['incidentTime'],
                        locationId != null ?
                        locationsTimezoneMap[locationId].timezone : null,
                        `${constants.DATE_FORMATTER_KEY} ${constants.TIME_FORMATTER_KEY}`
                    );
                    incident['Match ID'] = incident['matchId'];
                    const playerIds = [];
                    const playerFirstNames = [];
                    const playerLastNames = [];
                    if (isArrayPopulated(incident['incidentPlayers'])) {
                        for (let r of incident['incidentPlayers']) {
                            playerIds.push(r['playerId']);
                            playerFirstNames.push(r['player']['firstName']);
                            playerLastNames.push(r['player']['lastName']);
                        }
                    }
                    incident['Player ID'] = playerIds.toString().replace(",", '\n');
                    incident['First Name'] = playerFirstNames.toString().replace(",", '\n');
                    incident['Last Name'] = playerLastNames.toString().replace(",", '\n');
                    incident['Type'] = incident['incidentType']['name'];

                    delete incident['id'];
                    delete incident['guid'];
                    delete incident['matchId'];
                    delete incident['teamId'];
                    delete incident['competitionId'];
                    delete incident['incidentTypeId'];
                    delete incident['description'];
                    delete incident['incidentTime'];
                    delete incident['createdAt'];
                    delete incident['updated_at'];
                    delete incident['deleted_at'];
                    delete incident['incidentType'];
                    delete incident['match'];
                    delete incident['competition'];
                    delete incident['incidentPlayers'];
                    delete incident['incidentMediaList'];

                    return incident;
                });
            } else {
                incidentData.results.push({
                    ['Date']: '',
                    ['Match ID']: '',
                    ['Player ID']: '',
                    ['First Name']: '',
                    ['Last Name']: '',
                    ['Type']: ''
                });
            }

            response.setHeader('Content-disposition', 'attachment; filename=incidents.csv');
            response.setHeader('content-type', 'text/csv');
            fastcsv.write(incidentData.results, { headers: true })
                .on('finish', function () {
                })
                .pipe(response);
      } else {
        return response.status(400).send({
            name: 'export_error',
            message: 'Required fields are missing',
        });
      }
  }
}
