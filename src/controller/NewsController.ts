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
import {BaseController} from "./BaseController";
import {User} from "../models/User";
import {News} from "../models/News";
import {Response} from "express";
import {authToken, fileExt, isNullOrEmpty, isPhoto, isVideo, timestamp, isArrayEmpty, stringTONumber} from "../utils/Utils";

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
        @Param("id") id: number,
        @HeaderParam("authorization") user: User) {
        return this.newsService.softDelete(id, user.id);
    }

    @Authorized()
    @Post('/')
    async uploadNews(
        @Body() body: News,
        @UploadedFiles("newsMedia") newsMedia: any[],
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

            if (n.entityId && n.title) {
                if (isArrayEmpty(newsMedia)) {
                    for (let i of newsMedia) {
                        if (isPhoto(i.mimetype)) {
                            let filename = `/media/news/${n.entityId}_${n.entityId}/${n.title}_${timestamp()}.${fileExt(i.originalname)}`;
                            let fileUploaded = await this.firebaseService.upload(filename, i);
                            if (fileUploaded) {
                                n.newsImage = fileUploaded.url;
                            } else {
                                return response.status(400).send({ errorCode: 6, name: 'save_error', message: 'News Image not saved, try again later.' });
                            }
                        } else if (isVideo(i.mimetype)) {
                            let filename = `/media/news/${n.entityTypeId}_${n.entityId}/${n.title}_${timestamp()}.${fileExt(i.originalname)}`;
                            let fileUploaded = await this.firebaseService.upload(filename, i);
                            if (fileUploaded) {
                                n.newsVideo = fileUploaded.url;
                            } else {
                                return response.status(400).send({ errorCode: 5, name: 'save_error', message: 'News Video not saved, try again later.' });
                            }
                        } else {
                            return response.status(400).send({ errorCode: 4, name: 'validation_error', message: 'File mime type not supported' });
                        }
                    }
                }

                const savedNews = await this.newsService.createOrUpdate(n);
                const getNews = await this.newsService.findById(savedNews.id);
                return response.status(200).send(getNews);

            } else {
                return response.status(212).send({
                    errorCode: 1,
                    message: 'Please pass entityId & title in the parameter'
                })
            }
        } catch (e) {
            return response.status(500).send({ e, name: 'upload_error', message: 'Unexpected error on load image. Try again later.' });
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
        @QueryParam("id", {required: true}) id: number,
        @QueryParam("silent") silent: boolean = true,
        @Res() response: Response
    ) {
        let news = await this.newsService.findById(id);
        if (news) {
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
                    this.firebaseService.sendMessageChunked({tokens: tokens, data: data});
                    // news.isNotification = true;
                } else {
                    this.firebaseService.sendMessageChunked({
                        tokens: tokens,
                        title: news.author,
                        body: news.title,
                        data: data
                    });
                    news.isNotification = true;
                }

                news.published_at = new Date();
                news.isActive = true;
                await this.newsService.createOrUpdate(news);

                return response.status(200).send({success: true});
            } else {
                return response.status(200).send(
                    {name: 'search_error', message: `Devices for news with id ${id} not found`});
            }
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `News with id ${id} not found`});
        }
    }
}
