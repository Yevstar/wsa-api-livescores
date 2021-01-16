import {Authorized, Body, Get, JsonController, Param, Post, QueryParam} from "routing-controllers";
import {BaseController} from "./BaseController";
import {RequiredQueryParam} from "../decorators/RequiredQueryParamDecorator";
import {UmpirePaymentOrganiserSettingsDto} from "../models/dto/UmpirePaymentOrganiserSettingsDto";
import {UmpirePaymentSetting} from "../models/UmpirePaymentSetting";
import {UmpirePaymentSettingsResponseDto} from "../models/dto/UmpirePaymentSettingsResponseDto";

@JsonController('/competitions/:competitionId/umpires/payment/settings')
@Authorized()
export class UmpirePaymentSettingsController extends BaseController {

    @Get()
    index(
        @Param('competitionId') competitionId: number,
        @QueryParam('organisationId') organisationId: number,
    ): Promise<UmpirePaymentSettingsResponseDto> {
        return this.umpirePaymentSettingsService.getPaymentSettings(competitionId, organisationId)
    }

    @Post('/organiser')
    saveOrganiserSettings(
        @Param('competitionId') competitionId: number,
        @RequiredQueryParam('organisationId') organisationId: number,
        @Body() body: UmpirePaymentOrganiserSettingsDto
    ): Promise<UmpirePaymentSettingsResponseDto> {
        return this.umpirePaymentSettingsService.saveOrganiserSettings(organisationId, competitionId, body)
    }

    @Post('/affiliate')
    saveAffiliateSettings(
        @Param('competitionId') competitionId: number,
        @RequiredQueryParam('organisationId') organisationId: number,
        @Body() body: UmpirePaymentSetting[]
    ): Promise<UmpirePaymentSettingsResponseDto> {
        return this.umpirePaymentSettingsService.saveAffiliateSettings(organisationId, competitionId, body)
    }
}
