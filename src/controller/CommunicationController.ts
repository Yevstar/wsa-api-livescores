import {
    Get,
    JsonController,
    QueryParam,
    HeaderParam,
    Authorized,
    Res,
    Post,
    Param,
    Body,
    UploadedFiles,
    Delete
} from "routing-controllers";
import { BaseController } from "./BaseController";
import { User } from "../models/User";
import { Communication } from "../models/Communication";
import { Response } from "express";
import { authToken, fileExt, isNullOrEmpty, isPhoto, isVideo, timestamp, isArrayPopulated, stringTONumber, fileUploadOptions } from "../utils/Utils";

@JsonController("/communications")
export class CommunicationController extends BaseController {

    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.communicationService.findById(id);
    }

    @Authorized()
    @Delete('/id/:id')
    async softDelete(
        @Param("id") id: number
    ) {
        let communication = await this.communicationService.findById(id);
        let deleteResponse = await this.communicationService.softDelete(id);
        if (communication) {
            let tokens = await this.deviceService.findDeviceForCommunication(communication);
            if (tokens && tokens.length > 0) {
                let data = {
                    type: 'communication_removed',
                    communication_id: communication.id.toString()
                };

                this.firebaseService.sendMessageChunked({ tokens: tokens, data: data });
            }
        }
        return deleteResponse;
    }

    @Authorized()
    @Post('/')
    async uploadCommunication(
        @Body() body: Communication,
        @UploadedFiles("communicationMedia", { options: fileUploadOptions }) communicationMedia: any[],
        @Res() response: Response) {
        try {
            // as there is an issue while updating the communication, I have changed the type of body
            // "id" should be integer while updation, so that I have split the body parameters to convert id into integer
            let n = new Communication();
            n.title = body.title;
            n.body = body.body;
            n.author = body.author;
            n.recipients = body.recipients;
            n.communication_expire_date = body.communication_expire_date;
            n.recipientRefId = body.recipientRefId;
            n.toUserRoleIds = body.toUserRoleIds;
            n.id = stringTONumber(body.id);
            let imageFilePopulated = false;
            let videoFilePopulated = false;
            let communication;
            if (n.id) {
                communication = await this.communicationService.findById(n.id);
            }
            if (n.title) {
                if (body.communicationImage) {
                    n.communicationImage = body.communicationImage;
                }
                if (body.communicationVideo) {
                    n.communicationVideo = body.communicationVideo
                }
                if (isArrayPopulated(communicationMedia)) {
                    for (let i of communicationMedia) {
                        if (!isVideo(i.mimetype) && !isPhoto(i.mimetype)) {
                            return response.status(400).send({ errorCode: 4, name: 'validation_error', message: 'File mime type not supported' });
                        }
                        if (isPhoto(i.mimetype)) {
                            imageFilePopulated = true;
                            let filename = `/media/communication/${n.title}_${timestamp()}.${fileExt(i.originalname)}`;
                            let fileUploaded = await this.firebaseService.upload(filename, i);
                            if (fileUploaded) {
                                n.communicationImage = fileUploaded.url;
                                if (communication && communication.communicationImage) {
                                    const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(communication.communicationImage), 'communication%2F')
                                    await this.firebaseService.removeMedia(fileName);
                                }
                            } else {
                                return response.status(400).send({ errorCode: 6, name: 'save_error', message: 'Communication Image not saved, try again later.' });
                            }
                            continue;
                        }
                        if (isVideo(i.mimetype)) {
                            videoFilePopulated = true;
                            let filename = `/media/communication/${n.title}_${timestamp()}.${fileExt(i.originalname)}`;
                            let fileUploaded = await this.firebaseService.upload(filename, i);
                            if (fileUploaded) {
                                n.communicationVideo = fileUploaded.url;
                                if (communication && communication.communicationVideo) {
                                    const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(communication.communicationVideo), 'communication%2F');
                                    await this.firebaseService.removeMedia(fileName);
                                }
                            } else {
                                return response.status(400).send({ errorCode: 5, name: 'save_error', message: 'Communication Video not saved, try again later.' });
                            }
                        }
                    }
                }
                //removing image file
                if (n.id && !body.communicationImage && !imageFilePopulated) {
                    if (communication.communicationImage) {
                        const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(communication.communicationImage), 'communication%2F')
                        await this.firebaseService.removeMedia(fileName);
                        n.communicationImage = null;
                    }
                }
                //removing video file
                if (n.id && !body.communicationVideo && !videoFilePopulated) {
                    if (communication.communicationVideo) {
                        const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(communication.communicationVideo), 'communication%2F');
                        await this.firebaseService.removeMedia(fileName);
                        n.communicationVideo = null;
                    }
                }
                const savedCommunication = await this.communicationService.createOrUpdate(n);
                const getCommunication = await this.communicationService.findById(savedCommunication.id);
                if (getCommunication) {
                    let tokens = await this.deviceService.findDeviceForCommunication(getCommunication);
                    if (tokens && tokens.length > 0) {
                        let data = {
                            type: 'communication_updated',
                            communication_id: getCommunication.id.toString()
                        };

                        this.firebaseService.sendMessageChunked({ tokens: tokens, data: data });
                    }
                }
                return response.status(200).send(getCommunication);

            } else {
                return response.status(212).send({
                    errorCode: 1,
                    message: 'Please pass entityId & title in the parameter'
                })
            }
        } catch (e) {
            return response.status(500).send({ e, name: 'upload_error', message: e.message });
        }
    }

    @Authorized()
    @Get("/admin")
    async find(
        @QueryParam("entityId") entityId: number = undefined,
        @QueryParam("entityTypeId") entityTypeId: number = undefined,
        @Res() response: Response
    ) {
        if (entityId && entityTypeId) {
            return await this.communicationService.findByParam(entityId, entityTypeId);
        } else {
            return response.status(400).send({
                name: 'bad_request', message: 'Missing parameters'
            });
        }
    }

    @Authorized("spectator")
    @Get("/")
    async findUserCommunication(
        @HeaderParam("authorization") user: User,
        @QueryParam("deviceId") deviceId: string = undefined,
        @Res() response: Response
    ) {
        if (!user && !deviceId) {
            return response.status(400).send({
                name: 'bad_request', message: 'You must be authorized or sending device ID'
            });
        }
        return await this.communicationService.findUserCommunication(user ? user.id : undefined, deviceId);
    }

    @Authorized()
    @Get("/publish")
    async publishCommunication(
        @HeaderParam("authorization") user: User,
        @QueryParam("id", { required: true }) id: number,
        @QueryParam("silent") silent: boolean = true,
        @Res() response: Response
    ) {
        let communication = await this.communicationService.findById(id);
        if (communication) {
            communication.published_at = new Date();
            communication.isActive = true;
            if (!silent) {
                communication.isNotification = true;
            }
            await this.communicationService.createOrUpdate(communication);

            let tokens = await this.deviceService.findDeviceForCommunication(communication);
            if (tokens && tokens.length > 0) {
                let data = {
                    type: 'communication_updated',
                    communication_id: communication.id.toString(),
                    title: communication.title,
                    author: communication.author,
                    updated_at: communication.updated_at.toString()
                };
                if (silent) {
                    this.firebaseService.sendMessageChunked({ tokens: tokens, data: data });
                    // communication.isNotification = true;
                } else {
                    this.firebaseService.sendMessageChunked({
                        tokens: tokens,
                        title: communication.author,
                        body: communication.title,
                        data: data
                    });
                }
            }

            return response.status(200).send({ success: true });
        } else {
            return response.status(400).send(
                { name: 'search_error', message: `Communication with id ${id} not found` });
        }
    }
}
