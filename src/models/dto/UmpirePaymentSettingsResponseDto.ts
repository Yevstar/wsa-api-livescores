import {UmpirePaymentSetting} from "../UmpirePaymentSetting";
import {UmpirePaymentAllowedDivisionsSetting} from "../UmpirePaymentAllowedDivisionsSetting";

export class UmpirePaymentSettingsResponseDto {
    constructor(
        public umpirePaymentSettings: UmpirePaymentSetting[] = [],
        public allowedDivisionsSetting: UmpirePaymentAllowedDivisionsSetting = null,
        public noPaymentThroughPlatform: boolean = false,
    ) {}
}
