import {Get,
    JsonController,
    QueryParam,
    Param,
    Authorized,
    Res, 
    Post,
    HeaderParam,
    UploadedFiles,
    BodyParam
} from "routing-controllers";
import {BaseController} from "./BaseController";
import {Incident} from "../models/Incident";
import {IncidentPlayer} from "../models/IncidentPlayer";
import {Response} from "express";
import {fileExt, isPhoto, isVideo, timestamp, stringTONumber, paginationData, isNotNullAndUndefined} from "../utils/Utils";
import {logger} from "../logger";
import {User} from "../models/User";

@JsonController("/incident")
export class IncidentControllerController extends BaseController {

    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.incidentService.findById(id);
    }

    @Authorized()
    @Get('/')
    async find(
        @QueryParam("incidentId") incidentId: number,
        @QueryParam("competitionId") competitionId: number,
        @QueryParam("offset") offset: number,
        @QueryParam("limit") limit: number,
        @QueryParam("search") search: string,
        @Res() response: Response
    ) {
        if (incidentId || competitionId) {
            const incidentData = await this.incidentService.findByParams(incidentId, competitionId, offset, limit, search);
            if (incidentData && isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit)) {
                let responseObject = paginationData(stringTONumber(incidentData.count), limit, offset)
                responseObject["incidents"] = incidentData.result;
                return responseObject;
            } else {
                return incidentData.result;
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
                const result = await this.incidentService.createOrUpdate(incident);
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
            return response.status(400).send(
                {name: 'validation_error', message: `Failed to create incident`});
        }
    } 

    @Authorized()
    @Post('/media')
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
                        media.push(this.incidentService.createIncidentMedia(incidentId, user.id, url, file.mimetype));
                        result.push({file: file.originalname, success: true})
                    } else {
                        result.push({file: file.originalname, success: false})
                    }
                }
                await this.incidentService.saveIncidentMedia(media);
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
}
