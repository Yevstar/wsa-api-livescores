import {UmpirePayerTypeEnum} from "../enums/UmpirePayerTypeEnum";
import {UmpirePaymentSetting} from "../UmpirePaymentSetting";
import {UmpirePaymentAllowedDivisionsSetting} from "../UmpirePaymentAllowedDivisionsSetting";

export class UmpirePaymentSettingsResponseDto {
    constructor(
        public umpirePaymentSettings: UmpirePaymentSetting[] = [],
        public allowedDivisionsSetting: UmpirePaymentAllowedDivisionsSetting = null
    ) {}
}
