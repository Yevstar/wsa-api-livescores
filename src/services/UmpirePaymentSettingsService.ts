import BaseService from "./BaseService";
import {UmpirePaymentSetting} from "../models/UmpirePaymentSetting";
import {Inject} from "typedi";
import CompetitionService from "./CompetitionService";
import {ForbiddenError} from "routing-controllers";
import {UmpirePaymentOrganiserSettingsDto} from "../models/dto/UmpirePaymentOrganiserSettingsDto";

export class UmpirePaymentSettingsService extends BaseService<UmpirePaymentSetting> {
    modelName(): string {
        return UmpirePaymentSetting.name;
    }

    @Inject()
    private readonly competitionService: CompetitionService;

    async saveOrganiserSettings(organisationId: number, competitionId: number, body: UmpirePaymentOrganiserSettingsDto) {
        if (!this.competitionService.isCompetitionOrganiser(organisationId, competitionId)) {
            throw new ForbiddenError("Only competition organiser can save this setting");
        }
    }

    async saveAffiliateSettings(organisationId: number, competitionId: number, body: UmpirePaymentSetting[]) {
        if (!this.competitionService.isCompetitionAffiliate(organisationId, competitionId)) {
            throw new ForbiddenError("Only competition affiliate can save this setting");
        }
    }
}