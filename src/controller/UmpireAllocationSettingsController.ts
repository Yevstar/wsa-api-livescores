import {BaseController} from "./BaseController";
import {Authorized, Body, Get, JsonController, Param, Post, QueryParam} from "routing-controllers";
import {UmpireAllocationSettingsStoreDto} from "../models/dto/UmpireAllocationSettingsStoreDto";
import {UmpireAllocationSettingsResponseDto} from "../models/dto/UmpireAllocationSettingsResponseDto";

@JsonController('/competitions/:competitionId/umpires/settings/allocation')
export class UmpireAllocationSettingsController extends BaseController {

    @Authorized()
    @Get()
    async index(@Param('competitionId') competitionId: number): Promise<UmpireAllocationSettingsResponseDto> {
        return this.umpireSettingsService.getAllocationSettings(competitionId);
    }

    @Authorized()
    @Post()
    async save(
        @Param('competitionId') competitionId: number,
        @QueryParam('organisationId') organisationId: number,
        @Body({validate: true}) settings: UmpireAllocationSettingsStoreDto,
    ): Promise<UmpireAllocationSettingsResponseDto> {
        return this.umpireSettingsService.saveAllocationSettings(organisationId, competitionId, settings);
    }
}