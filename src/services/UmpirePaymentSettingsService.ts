import BaseService from "./BaseService";
import {UmpirePaymentSetting} from "../models/UmpirePaymentSetting";
import {Inject} from "typedi";
import CompetitionService from "./CompetitionService";
import {ForbiddenError} from "routing-controllers";
import {UmpirePaymentOrganiserSettingsDto} from "../models/dto/UmpirePaymentOrganiserSettingsDto";
import CompetitionOrganisationService from "./CompetitionOrganisationService";
import {Division} from "../models/Division";
import {UmpirePayerTypeEnum} from "../models/enums/UmpirePayerTypeEnum";
import {UmpirePaymentAllowedDivisionsSetting} from "../models/UmpirePaymentAllowedDivisionsSetting";
import {DeepPartial} from "typeorm-plus";
import {Competition} from "../models/Competition";
import {UmpirePaymentSettingsResponseDto} from "../models/dto/UmpirePaymentSettingsResponseDto";
import {EmptyDivisionsError} from "../exceptions/EmptyDivisionsError";

export class UmpirePaymentSettingsService extends BaseService<UmpirePaymentSetting> {
    modelName(): string {
        return UmpirePaymentSetting.name;
    }

    @Inject()
    private readonly competitionService: CompetitionService;

    @Inject()
    private readonly competitionOrganisationService: CompetitionOrganisationService;

    async getPaymentSettings(competitionId: number): Promise<UmpirePaymentSettingsResponseDto> {
        const competition = await this.entityManager.findOneOrFail(Competition, competitionId, {
            relations: ["umpirePaymentAllowedDivisionsSetting", "umpirePaymentSettings", "umpirePaymentSettings.divisions", "umpirePaymentAllowedDivisionsSetting.divisions"]
        });

        return new UmpirePaymentSettingsResponseDto(competition.umpirePayerTypeRefId, competition.umpirePaymentSettings, competition.umpirePaymentAllowedDivisionsSetting)
    }

    async saveOrganiserSettings(organisationId: number, competitionId: number, body: UmpirePaymentOrganiserSettingsDto): Promise<UmpirePaymentSettingsResponseDto> {
        if (! await this.competitionService.isCompetitionOrganiser(organisationId, competitionId)) {
            throw new ForbiddenError("Only competition organiser can save this setting");
        }

        const competition = await this.entityManager.findOneOrFail(Competition, competitionId);
        competition.umpirePayerTypeRefId = body.umpirePayerTypeRefId;

        const response = new UmpirePaymentSettingsResponseDto(body.umpirePayerTypeRefId);
        if (UmpirePayerTypeEnum.ORGANISER === body.umpirePayerTypeRefId) {

            await this.entityManager.delete(UmpirePaymentSetting, {
                competitionId: competitionId
            });

            for (const paymentSettingData of body.umpirePaymentSettings) {
                response.umpirePaymentSettings.push(await this.setPaymentSetting(paymentSettingData, competitionId));
            }
        } else {
            const allowedDivisionsSetting = new UmpirePaymentAllowedDivisionsSetting;

            allowedDivisionsSetting.allDivisions = body.allowedDivisionsSetting.allDivisions;
            if (!body.allowedDivisionsSetting.allDivisions && (body.allowedDivisionsSetting.divisions||[]).length) {
                allowedDivisionsSetting.divisions = await Promise.all(body.allowedDivisionsSetting.divisions.map(divisionId => this.entityManager.findOneOrFail(Division, divisionId)));
            } else if (!body.allowedDivisionsSetting.allDivisions && !(body.allowedDivisionsSetting.divisions||[]).length) {
                throw new EmptyDivisionsError
            }

            allowedDivisionsSetting.competitionId = competitionId;

            response.allowedDivisionsSetting = await this.entityManager.save(allowedDivisionsSetting)
        }

        await competition.save()

        return response;
    }

    async saveAffiliateSettings(organisationId: number, competitionId: number, body: UmpirePaymentSetting[]) {
        if (! await this.competitionService.isCompetitionAffiliate(organisationId, competitionId)) {
            throw new ForbiddenError("Only competition affiliate can save this setting");
        }

        const competition = await this.entityManager.findOneOrFail(Competition, competitionId, {relations: ["umpirePaymentAllowedDivisionsSetting", "umpirePaymentAllowedDivisionsSetting.divisions"]});

        if (UmpirePayerTypeEnum.AFFILIATE !== competition.umpirePayerTypeRefId) {
            throw new ForbiddenError("Affiliate is not allowed to save this setting")
        }

        const allowedDivisions = competition.umpirePaymentAllowedDivisionsSetting.divisions.map(division => division.id);

        const settings = [];
        for (const paymentSettingData of body) {
            paymentSettingData.divisions.forEach(divisionId => {
                if (-1 === allowedDivisions.indexOf(divisionId as unknown as number)) {
                    throw new ForbiddenError(`Payment settings for division ${divisionId} is forbidden for affiliate`)
                }
            });

            settings.push(await this.setPaymentSetting(paymentSettingData, competitionId));
        }

        return new UmpirePaymentSettingsResponseDto(competition.umpirePayerTypeRefId, settings, competition.umpirePaymentAllowedDivisionsSetting)
    }

    protected async setPaymentSetting(paymentSettingData: DeepPartial<UmpirePaymentSetting>, competitionId: number): Promise<UmpirePaymentSetting> {
        const paymentSetting = new UmpirePaymentSetting;
        paymentSetting.allDivisions = paymentSettingData.allDivisions;
        paymentSetting.competitionId = competitionId;

        if (!paymentSettingData.allDivisions && (paymentSettingData.divisions||[]).length) {
            paymentSetting.divisions = await Promise.all(paymentSettingData.divisions.map(divisionId => this.entityManager.findOneOrFail(Division, divisionId)));
        } else if (!paymentSettingData.allDivisions && !(paymentSettingData.divisions||[]).length) {
            throw new EmptyDivisionsError;
        }

        return await this.entityManager.save(paymentSetting);
    }
}