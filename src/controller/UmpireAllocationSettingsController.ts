import { BaseController } from './BaseController';
import {
  Authorized,
  Body,
  Get,
  JsonController,
  Param,
  Post,
  QueryParam,
} from 'routing-controllers';
import { UmpireAllocationSettingsStoreDto } from '../models/dto/UmpireAllocationSettingsStoreDto';
import { UmpireAllocationSettingsResponseDto } from '../models/dto/UmpireAllocationSettingsResponseDto';
import { RequiredQueryParam } from '../decorators/RequiredQueryParamDecorator';

@JsonController('/competitions/:competitionId/umpires/settings/allocation')
@Authorized()
export class UmpireAllocationSettingsController extends BaseController {
  @Get()
  async index(
    @Param('competitionId') competitionId: number,
  ): Promise<UmpireAllocationSettingsResponseDto> {
    return this.umpireSettingsService.getAllocationSettings(competitionId);
  }

  @Post()
  async save(
    @Param('competitionId') competitionId: number,
    @RequiredQueryParam('organisationId') organisationId: number,
    @Body({ validate: true }) settings: UmpireAllocationSettingsStoreDto,
  ): Promise<UmpireAllocationSettingsResponseDto> {
    return this.umpireSettingsService.saveAllocationSettings(
      organisationId,
      competitionId,
      settings,
    );
  }
}
