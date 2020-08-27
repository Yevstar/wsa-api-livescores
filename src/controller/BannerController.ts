import { Response, response } from "express";
import {
    Get,
    JsonController,
    QueryParam,
    Body,
    Post,
    UploadedFile,
    Delete,
    Authorized,
    Param,
    Res
} from "routing-controllers";

import { BaseController } from "./BaseController";
import { Banner } from "../models/Banner";
import { isPhoto, fileExt, timestamp, isNotNullAndUndefined } from "../utils/Utils";

@JsonController("/banners")
export class BannerController extends BaseController {

    @Get("/")
    async find(
        @QueryParam("competitionIds", { required: true }) competitionIds: number[],
        @QueryParam("pageType") pageType: "HOME" | "DRAWS" | "LADDER" | "CHAT" | "NEWS",
        @QueryParam("format") format: "Horizontal" | "Square"
    ): Promise<Banner[]> {
        return await this.bannerService.findByParams(competitionIds, pageType, format);
    }

    @Authorized()
    @Post("/")
    async saveBanner(
        @Body() bannerBody: any,
        @QueryParam("competitionId", { required: true }) competitionId: number,
        @UploadedFile("bannerImage") file: Express.Multer.File,
        @Res() response: Response) {
        try {
            // as the content coming in request is of type "form-data", ie. string and
            // id should be of type integer for edit mode, so changed the type of body from Banner to any
            const banner = new Banner();
            if (file) {
                if (isPhoto(file.mimetype)) {
                    let filename = `/media/banner/${competitionId}_${timestamp()}.${fileExt(file.originalname)}`;
                    let fileUploaded = await this.firebaseService.upload(filename, file);

                    if (fileUploaded) {
                        bannerBody.bannerUrl = fileUploaded.url;
                    } else {
                        return response.status(400).send({
                            errorCode: 5,
                            name: 'save_error',
                            message: 'Banner Image not saved, try again later.'
                        });
                    }
                } else {
                    return response.status(400).send({
                        errorCode: 4,
                        name: 'validation_error',
                        message: 'File mime type not supported'
                    });
                }
            }

            banner.id = parseInt(bannerBody.id);
            banner.format = bannerBody.format;
            banner.bannerUrl = bannerBody.bannerUrl;
            banner.bannerLink = bannerBody.bannerLink;
            banner.showOnHome = (bannerBody.showOnHome == '1') ? (bannerBody.showOnHome = true) : (bannerBody.showOnHome = false);
            banner.showOnDraws = (bannerBody.showOnDraws == '1' && banner.format == 'Horizontal') ? (bannerBody.showOnDraws = true) : (bannerBody.showOnDraws = false);
            banner.showOnLadder = (bannerBody.showOnLadder == '1' && banner.format == 'Horizontal') ? (bannerBody.showOnLadder = true) : (bannerBody.showOnLadder = false);
            banner.showOnNews = (bannerBody.showOnNews == '1') ? (bannerBody.showOnNews = true) : (bannerBody.showOnNews = false);
            banner.showOnChat = (bannerBody.showOnChat == '1' && banner.format == 'Horizontal') ? (bannerBody.showOnChat = true) : (bannerBody.showOnChat = false);
            banner.competitionId = bannerBody.competitionId;
            banner.sequence = bannerBody.sequence;

            const data = await this.bannerService.createOrUpdate(banner);
            return await this.bannerService.findById(data.id);
        } catch (err) {
            return response.status(212).send({
                err, name: 'unexpected_error', message: 'Failed to save the banner detail.'
            });
        }
    }

    @Authorized()
    @Delete('/id/:id')
    async deleteById(
        @Param("id") id: number,
        @Res() response: Response) {
        const banner = await this.bannerService.findById(id);

        if (isNotNullAndUndefined(banner)) {

            const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(banner.bannerUrl), 'banner%2F');
            await this.firebaseService.removeMedia(fileName)
            return this.bannerService.deleteById(id);

        } else {

            return response.status(400).send({
                name: 'delete_error',
                message: `Banner was already deleted`
            });
        }
    }
}
