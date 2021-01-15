import {IsArray, IsNotEmpty, IsOptional} from "class-validator";
import {UmpirePaymentSetting} from "../UmpirePaymentSetting";
import {UmpirePaymentAllowedDivisionsSetting} from "../UmpirePaymentAllowedDivisionsSetting";

export class UmpirePaymentOrganiserSettingsDto {
    @IsArray()
    @IsOptional()
    umpirePaymentSettings: UmpirePaymentSetting[];

    @IsNotEmpty()
    allowedDivisionsSetting: UmpirePaymentAllowedDivisionsSetting;
}
