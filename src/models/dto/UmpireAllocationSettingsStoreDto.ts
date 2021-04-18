import { UmpireAllocationSetting } from '../UmpireAllocationSetting';
import { NoUmpiresUmpireAllocationSetting } from '../NoUmpiresUmpireAllocationSetting';
import { IsArray, IsNotEmpty, IsOptional } from 'class-validator';

export class UmpireAllocationSettingsStoreDto {
  @IsArray()
  @IsNotEmpty()
  umpireAllocationSettings: UmpireAllocationSetting[];

  @IsOptional()
  noUmpiresSetting: NoUmpiresUmpireAllocationSetting;
}
