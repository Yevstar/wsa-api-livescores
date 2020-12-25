import {Body, JsonController, Param, Post} from "routing-controllers";
import {BaseController} from "./BaseController";
import {RequiredQueryParam} from "../decorators/RequiredQueryParamDecorator";
import {UmpirePaymentOrganiserSettingsDto} from "../models/dto/UmpirePaymentOrganiserSettingsDto";
import {UmpirePaymentSetting} from "../models/UmpirePaymentSetting";
import {UmpirePaymentSettingsResponseDto} from "../models/dto/UmpirePaymentSettingsResponseDto";

@JsonController('/competitions/:competitionId/umpires/payment/settings')
export class UmpirePaymentSettingsController extends BaseController {

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
    ): Promise<void> {
        return this.umpirePaymentSettingsService.saveAffiliateSettings(organisationId, competitionId, body)
    }
}