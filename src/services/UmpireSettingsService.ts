import {UmpireAllocationSettingsStoreDto} from "../models/dto/UmpireAllocationSettingsStoreDto";
import {UmpireAllocationSettingsResponseDto} from "../models/dto/UmpireAllocationSettingsResponseDto";
import BaseService from "./BaseService";
import {UmpireAllocationSetting} from "../models/UmpireAllocationSetting";
import {Division} from "../models/Division";
import {Competition} from "../models/Competition";
import {NoUmpiresUmpireAllocationSetting} from "../models/NoUmpiresUmpireAllocationSetting";
import {BadRequestError, ForbiddenError} from "routing-controllers";
import {Inject} from "typedi";
import CompetitionOrganisationService from "./CompetitionOrganisationService";
import {CompetitionParticipatingTypeEnum} from "../models/enums/CompetitionParticipatingTypeEnum";
import {logger} from "../logger";

export class UmpireSettingsService extends BaseService<UmpireAllocationSetting> {
    modelName(): string {
        return UmpireAllocationSetting.name;
    }

    @Inject()
    private readonly competitionOrganisationService: CompetitionOrganisationService;

    async getAllocationSettings(competitionId: number): Promise<UmpireAllocationSettingsResponseDto> {
        const competition = await this.entityManager.findOneOrFail(Competition, competitionId, {
            relations: [
                'umpireAllocationSettings',
                'noUmpiresUmpireAllocationSetting',
                'umpireAllocationSettings.divisions',
                'noUmpiresUmpireAllocationSetting.divisions',
            ]
        });

        return new UmpireAllocationSettingsResponseDto(
            competition.umpireAllocationSettings,
            competition.noUmpiresUmpireAllocationSetting
        )
    }

    async saveAllocationSettings(
        organisationId: number,
        competitionId: number,
        settings: UmpireAllocationSettingsStoreDto
    ): Promise<UmpireAllocationSettingsResponseDto> {

        if (CompetitionParticipatingTypeEnum.PARTICIPATED_IN === await this.competitionOrganisationService.getCompetitionParticipatingType(competitionId, organisationId)) {
            throw new ForbiddenError("You are not allowed to save this settings")
        }

        this.checkDivisionsOverlapping(settings);

        const competition = await this.entityManager.findOneOrFail(Competition, competitionId);

        await this.clearUmpireAllocationSettings(competitionId);

        const response = new UmpireAllocationSettingsResponseDto;
        if (settings.umpireAllocationSettings) {
            for (const settingData of settings.umpireAllocationSettings) {
                const setting = await this.entityManager.create(UmpireAllocationSetting, settingData)

                setting.competition = competition;
                setting.divisions = [];

                if (!settingData.allDivisions && (settingData.divisions||[]).length) {
                    for (const divisionId of settingData.divisions) {
                        const division = await this.entityManager.findOneOrFail(Division, divisionId);

                        setting.divisions.push(division);
                    }
                }

                response.umpireAllocationSettings.push(
                    await this.entityManager.save(setting)
                );
            }
        }
        if (settings.noUmpiresSetting) {
            const setting = await this.entityManager.create(NoUmpiresUmpireAllocationSetting, settings.noUmpiresSetting);

            setting.competition = competition;
            setting.divisions = [];

            if (!settings.noUmpiresSetting.allDivisions && (settings.noUmpiresSetting.divisions||[]).length) {
                for (const divisionId of settings.noUmpiresSetting.divisions) {
                    const division = await this.entityManager.findOneOrFail(Division, divisionId);

                    setting.divisions.push(division);
                }
            }

            response.noUmpiresUmpireAllocationSetting = await this.entityManager.save(setting);
        }

        return response;
    }

    async clearUmpireAllocationSettings(competitionId: number): Promise<void> {
        await this.entityManager.delete(UmpireAllocationSetting, {
            where: {
                competitionId: competitionId
            }
        });
        await this.entityManager.delete(NoUmpiresUmpireAllocationSetting, {
            where: {
                competitionId: competitionId
            }
        });
    }

    private checkDivisionsOverlapping(settings: UmpireAllocationSettingsStoreDto): void {
        const dto = (settings.umpireAllocationSettings||[]).map(setting => {
            return {
                divisions: [...setting.divisions],
                allDivisions: !!setting.allDivisions
            }
        });

        if (settings.noUmpiresSetting) {
            dto.push({
                divisions: [...settings.noUmpiresSetting.divisions],
                allDivisions: !!settings.noUmpiresSetting.allDivisions
            })
        }

        const divisions = dto.reduce((accumulator, current) => {
            accumulator.divisions.push(...current.divisions);
            return accumulator;
        }).divisions;

        if (
            new Set(divisions).size !== divisions.length ||
            dto.filter(item => item.allDivisions).length && divisions.length ||
            dto.filter(item => item.allDivisions).length > 1
        ) {
            throw new BadRequestError("Divisions should not overlap!")
        }
    }
}