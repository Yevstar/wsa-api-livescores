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

export class UmpirePaymentSettingsService extends BaseService<UmpirePaymentSetting> {
    modelName(): string {
        return UmpirePaymentSetting.name;
    }

    @Inject()
    private readonly competitionService: CompetitionService;

    @Inject()
    private readonly competitionOrganisationService: CompetitionOrganisationService;

    async saveOrganiserSettings(organisationId: number, competitionId: number, body: UmpirePaymentOrganiserSettingsDto): Promise<void> {
        if (!this.competitionService.isCompetitionOrganiser(organisationId, competitionId)) {
            throw new ForbiddenError("Only competition organiser can save this setting");
        }

        const competitionOrganisation = await this.competitionOrganisationService.getByCompetitionOrganisation(competitionId, organisationId);
        competitionOrganisation.competition.umpirePayerTypeRefId = body.umpirePayerTypeRefId;

        if (UmpirePayerTypeEnum.ORGANISER === body.umpirePayerTypeRefId) {
            for (const paymentSettingData of body.umpirePaymentSettings) {
                await this.setPaymentSetting(paymentSettingData, competitionOrganisation.competition);
            }
        } else {
            const allowedDivisionsSetting = new UmpirePaymentAllowedDivisionsSetting;

            allowedDivisionsSetting.divisions = await Promise.all(body.allowedDivisionsSetting.divisions.map(divisionId => this.entityManager.findOneOrFail(Division, divisionId)));
            competitionOrganisation.competition.umpirePaymentAllowedDivisionsSetting = allowedDivisionsSetting;
        }

        await this.entityManager.save(competitionOrganisation.competition);
    }

    async saveAffiliateSettings(organisationId: number, competitionId: number, body: UmpirePaymentSetting[]) {
        if (!this.competitionService.isCompetitionAffiliate(organisationId, competitionId)) {
            throw new ForbiddenError("Only competition affiliate can save this setting");
        }

        const competitionOrganisation = await this.competitionOrganisationService.getByCompetitionOrganisation(competitionId, organisationId);

        if (UmpirePayerTypeEnum.AFFILIATE !== competitionOrganisation.competition.umpirePayerTypeRefId) {
            throw new ForbiddenError("Affiliate is not allowed to save this setting")
        }

        const allowedDivisions = competitionOrganisation.competition.umpirePaymentAllowedDivisionsSetting.divisions.map(division => division.id);

        for (const paymentSettingData of body) {
            paymentSettingData.divisions.filter(divisionId => -1 !== allowedDivisions.indexOf(divisionId as unknown as number))

            await this.setPaymentSetting(paymentSettingData, competitionOrganisation.competition);
        }
    }

    protected async setPaymentSetting(paymentSettingData: DeepPartial<UmpirePaymentSetting>, competition: Competition): Promise<UmpirePaymentSetting> {
        competition.umpirePaymentSettings = [];

        const paymentSetting = new UmpirePaymentSetting;
        Object.assign(paymentSetting, paymentSettingData);

        paymentSetting.competition = competition;
        paymentSetting.divisions = await Promise.all(paymentSettingData.divisions.map(divisionId => this.entityManager.findOneOrFail(Division, divisionId)));

        await this.entityManager.save(competition);

        return await this.entityManager.save(paymentSetting);
    }
}