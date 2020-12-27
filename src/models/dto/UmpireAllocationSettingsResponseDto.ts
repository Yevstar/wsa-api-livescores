import {UmpireAllocationSetting} from "../UmpireAllocationSetting";
import {NoUmpiresUmpireAllocationSetting} from "../NoUmpiresUmpireAllocationSetting";

export class UmpireAllocationSettingsResponseDto {
    constructor(
        public umpireAllocationSettings: UmpireAllocationSetting[] = [],
        public noUmpiresUmpireAllocationSetting: NoUmpiresUmpireAllocationSetting = null
    ) {}
}