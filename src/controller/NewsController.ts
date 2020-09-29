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
import { News } from "../models/News";
import { Response } from "express";
import { authToken, fileExt, isNullOrEmpty, isPhoto, isVideo, timestamp, isArrayPopulated, stringTONumber, fileUploadOptions } from "../utils/Utils";

@JsonController("/news")
export class NewsController extends BaseController {

    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.newsService.findById(id);
    }

    @Authorized()
    @Delete('/id/:id')
    async softDelete(
        @Param("id") id: number
    ) {
        let news = await this.newsService.findById(id);
        let deleteResponse = await this.newsService.softDelete(id);
        if (news) {
            let tokens = await this.deviceService.findDeviceForNews(news);
            if (tokens && tokens.length > 0) {
                let data = {
                    type: 'news_removed',
                    news_id: news.id.toString()
                };

                this.firebaseService.sendMessageChunked({ tokens: tokens, data: data });
            }
        }
        return deleteResponse;
    }

    @Authorized()
    @Post('/')
    async uploadNews(
        @Body() body: News,
        @UploadedFiles("newsMedia", { options: fileUploadOptions }) newsMedia: any[],
        @Res() response: Response) {
        try {
            // as there is an issue while updating the news, I have changed the type of body
            // "id" should be integer while updation, so that I have split the body parameters to convert id into integer
            let n = new News();
            n.title = body.title;
            n.body = body.body;
            n.entityId = body.entityId;
            n.entityTypeId = body.entityTypeId;
            n.author = body.author;
            n.recipients = body.recipients;
            n.news_expire_date = body.news_expire_date;
            n.recipientRefId = body.recipientRefId;
            n.toUserRoleIds = body.toUserRoleIds;
            n.id = stringTONumber(body.id);
            let imageFilePopulated = false;
            let videoFilePopulated = false;
            let news;
            if (n.id) {
                news = await this.newsService.findById(n.id);
            }
            if (n.entityId && n.title) {
                if (body.newsImage) {
                    n.newsImage = body.newsImage;
                }
                if (body.newsVideo) {
                    n.newsVideo = body.newsVideo
                }
                if (isArrayPopulated(newsMedia)) {
                    for (let i of newsMedia) {
                        if (!isVideo(i.mimetype) && !isPhoto(i.mimetype)) {
                            return response.status(400).send({ errorCode: 4, name: 'validation_error', message: 'File mime type not supported' });
                        }
                        if (isPhoto(i.mimetype)) {
                            imageFilePopulated = true;
                            let filename = `/media/news/${n.entityTypeId}_${n.entityId}_${n.title}_${timestamp()}.${fileExt(i.originalname)}`;
                            let fileUploaded = await this.firebaseService.upload(filename, i);
                            if (fileUploaded) {
                                n.newsImage = fileUploaded.url;
                                if (news && news.newsImage) {
                                    const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(news.newsImage), 'news%2F')
                                    await this.firebaseService.removeMedia(fileName);
                                }
                            } else {
                                return response.status(400).send({ errorCode: 6, name: 'save_error', message: 'News Image not saved, try again later.' });
                            }
                            continue;
                        }
                        if (isVideo(i.mimetype)) {
                            videoFilePopulated = true;
                            let filename = `/media/news/${n.entityTypeId}_${n.entityId}_${n.title}_${timestamp()}.${fileExt(i.originalname)}`;
                            let fileUploaded = await this.firebaseService.upload(filename, i);
                            if (fileUploaded) {
                                n.newsVideo = fileUploaded.url;
                                if (news && news.newsVideo) {
                                    const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(news.newsVideo), 'news%2F');
                                    await this.firebaseService.removeMedia(fileName);
                                }
                            } else {
                                return response.status(400).send({ errorCode: 5, name: 'save_error', message: 'News Video not saved, try again later.' });
                            }
                        }
                    }
                }
                //removing image file
                if (n.id && !body.newsImage && !imageFilePopulated) {
                    if (news.newsImage) {
                        const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(news.newsImage), 'news%2F')
                        await this.firebaseService.removeMedia(fileName);
                        n.newsImage = null;
                    }
                }
                //removing video file
                if (n.id && !body.newsVideo && !videoFilePopulated) {
                    if (news.newsVideo) {
                        const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(news.newsVideo), 'news%2F');
                        await this.firebaseService.removeMedia(fileName);
                        n.newsVideo = null;
                    }
                }
                const savedNews = await this.newsService.createOrUpdate(n);
                const getNews = await this.newsService.findById(savedNews.id);
                if (getNews) {
                    let tokens = await this.deviceService.findDeviceForNews(getNews);
                    if (tokens && tokens.length > 0) {
                        let data = {
                            type: 'news_updated',
                            news_id: getNews.id.toString()
                        };

                        this.firebaseService.sendMessageChunked({ tokens: tokens, data: data });
                    }
                }
                return response.status(200).send(getNews);

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
            return await this.newsService.findByParam(entityId, entityTypeId);
        } else {
            return response.status(400).send({
                name: 'bad_request', message: 'Missing parameters'
            });
        }
    }

    @Authorized("spectator")
    @Get("/")
    async findUserNews(
        @HeaderParam("authorization") user: User,
        @QueryParam("deviceId") deviceId: string = undefined,
        @Res() response: Response
    ) {
        if (!user && !deviceId) {
            return response.status(400).send({
                name: 'bad_request', message: 'You must be authorized or sending device ID'
            });
        }
        return await this.newsService.findUserNews(user ? user.id : undefined, deviceId);
    }

    @Authorized()
    @Get("/publish")
    async publishNews(
        @HeaderParam("authorization") user: User,
        @QueryParam("id", { required: true }) id: number,
        @QueryParam("silent") silent: boolean = true,
        @Res() response: Response
    ) {
        let news = await this.newsService.findById(id);
        if (news) {
            news.published_at = new Date();
            news.isActive = true;
            if (!silent) {
                news.isNotification = true;
            }
            await this.newsService.createOrUpdate(news);

            let tokens = await this.deviceService.findDeviceForNews(news);
            if (tokens && tokens.length > 0) {
                let data = {
                    type: 'news_updated',
                    news_id: news.id.toString(),
                    title: news.title,
                    author: news.author,
                    updated_at: news.updated_at.toString()
                };
                if (silent) {
                    this.firebaseService.sendMessageChunked({ tokens: tokens, data: data });
                    // news.isNotification = true;
                } else {
                    this.firebaseService.sendMessageChunked({
                        tokens: tokens,
                        title: news.author,
                        body: news.title,
                        data: data
                    });
                }
            }

            return response.status(200).send({ success: true });
        } else {
            return response.status(400).send(
                { name: 'search_error', message: `News with id ${id} not found` });
        }
    }
}
