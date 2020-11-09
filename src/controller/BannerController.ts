import { Response } from "express";
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
    Res,
    UploadedFiles,
} from "routing-controllers";

import { BaseController } from "./BaseController";
import { Banner } from "../models/Banner";
import { isPhoto, fileExt, timestamp, isNotNullAndUndefined, isArrayPopulated } from "../utils/Utils";

@JsonController("/banners")
export class BannerController extends BaseController {

    @Get("/")
    async find(
        @QueryParam("competitionIds", { required: false }) competitionIds: number[],
        @QueryParam("organisationId", { required: false }) organisationId: number,
        // @QueryParam("pageType") pageType: "HOME" | "DRAWS" | "LADDER" | "CHAT" | "NEWS",
        @QueryParam("format") format: "Horizontal" | "Square"
    ): Promise<Banner[]> {
        
        return await this.bannerService.findByParams(organisationId, competitionIds, /* pageType, */ format);
    }

    @Authorized()
    @Post("/")
    async saveBanner(
        @Body() bannerBody: any,
        @QueryParam("competitionId", { required: true }) competitionId: number,
        @QueryParam("organisationId", { required: true }) organisationId: number,
        @UploadedFile("bannerImage") file: Express.Multer.File,
        @Res() response: Response
    ) {
        try {
            // as the content coming in request is of type "form-data", ie. string and
            // id should be of type integer for edit mode, so changed the type of body from Banner to any
            const banner = new Banner();
            if (file) {
                if (isPhoto(file.mimetype)) {
                    let filename = `/media/banner/${organisationId}_${competitionId}_${timestamp()}.${fileExt(file.originalname)}`;
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

            banner.competitionId = isNaN(bannerBody.competitionId) ? 0 : bannerBody.competitionId;
            banner.organisationId = bannerBody.organisationId;
            banner.id = parseInt(bannerBody.id);
            banner.format = bannerBody.format;
            banner.bannerUrl = bannerBody.bannerUrl;
            banner.bannerLink = bannerBody.bannerLink;
            // banner.showOnHome = (bannerBody.showOnHome == '1') ? (bannerBody.showOnHome = true) : (bannerBody.showOnHome = false);
            // banner.showOnDraws = (bannerBody.showOnDraws == '1' && banner.format == 'Horizontal') ? (bannerBody.showOnDraws = true) : (bannerBody.showOnDraws = false);
            // banner.showOnLadder = (bannerBody.showOnLadder == '1' && banner.format == 'Horizontal') ? (bannerBody.showOnLadder = true) : (bannerBody.showOnLadder = false);
            // banner.showOnNews = (bannerBody.showOnNews == '1') ? (bannerBody.showOnNews = true) : (bannerBody.showOnNews = false);
            // banner.showOnChat = (bannerBody.showOnChat == '1' && banner.format == 'Horizontal') ? (bannerBody.showOnChat = true) : (bannerBody.showOnChat = false);
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
    @Post("/communication")
    async saveCommunicationBanner(
        @Body() bannerBody: any,
        @QueryParam("organisationId", { required: true }) organisationId: number,
        @UploadedFiles("images", { required: false }) files: Express.Multer.File[],
        @Res() response: Response
    ) {
        try {
            const banner = new Banner();
            const imageTypes = bannerBody.imageTypes.split(',');

            if (isArrayPopulated(files) && isArrayPopulated(imageTypes)) {
                for (const i in files) {
                    if (files[i]) {
                        if (isPhoto(files[i].mimetype)) {
                            let filename = `/media/banner/${imageTypes[i]}_${organisationId}_${timestamp()}.${fileExt(files[i].originalname)}`;
                            let fileUploaded = await this.firebaseService.upload(filename, files[i]);

                            if (fileUploaded) {
                                bannerBody[imageTypes[i]] = fileUploaded.url;
                            } else {
                                response.status(400).send({
                                    errorCode: 5,
                                    name: 'save_error',
                                    message: 'Banner Image not saved, try again later.'
                                });
                            }
                        } else {
                            response.status(400).send({
                                errorCode: 4,
                                name: 'validation_error',
                                message: 'File mime type not supported'
                            });
                        }
                    }
                }
            }

            banner.organisationId = organisationId;
            banner.competitionId = 0;
            banner.id = parseInt(bannerBody.id);
            banner.sponsorName = bannerBody.sponsorName;
            banner.horizontalBannerUrl = bannerBody.horizontalBannerUrl;
            banner.horizontalBannerLink = bannerBody.horizontalBannerLink;
            banner.squareBannerUrl = bannerBody.squareBannerUrl;
            banner.squareBannerLink  = bannerBody.squareBannerLink;

            const data = await this.bannerService.createOrUpdate(banner);
            return await this.bannerService.findById(data.id);
        } catch (err) {
            return response.status(212).send({
                err,
                name: 'unexpected_error',
                message: 'Failed to save the banner detail.'
            });
        }
    }

    @Authorized()
    @Delete('/id/:id')
    async deleteById(
        @Param("id") id: number,
        @Res() response: Response
    ) {
        const banner = await this.bannerService.findById(id);

        if (isNotNullAndUndefined(banner)) {
            if (banner.bannerUrl) {
                const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(banner.bannerUrl), 'banner%2F');
                await this.firebaseService.removeMedia(fileName);
            }
            if (banner.horizontalBannerUrl) {
                const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(banner.horizontalBannerUrl), 'banner%2F');
                await this.firebaseService.removeMedia(fileName);
            }
            if (banner.squareBannerUrl) {
                const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(banner.squareBannerUrl), 'banner%2F');
                await this.firebaseService.removeMedia(fileName);
            }
            return this.bannerService.deleteById(id);
        } else {
            return response.status(400).send({
                name: 'delete_error',
                message: `Banner was already deleted`
            });
        }
    }

    @Authorized()
    @Post('/id/:id')
    async deleteImageById(
        @Param("id") id: number,
        @QueryParam("ratioType") ratioType: "square" | "horizontal" = undefined,
        @Res() response: Response
    ) {
        const banner = await this.bannerService.findById(id);

        if (isNotNullAndUndefined(banner) && ratioType) {
            const fileName = await this.firebaseService.getFileNameFromUrl(JSON.stringify(banner[`${ratioType}BannerUrl`]), 'banner%2F');
            await this.firebaseService.removeMedia(fileName);
            return this.bannerService.deleteImageById(id, ratioType);
        } else {
            return response.status(400).send({
                name: 'delete_error',
                message: 'Banner does not exist.'
            });
        }
    }
}
