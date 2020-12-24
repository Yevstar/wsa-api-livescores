import {IsArray, IsNotEmpty, IsNumber, IsOptional} from "class-validator";
import {UmpirePaymentSetting} from "../UmpirePaymentSetting";
import {UmpirePaymentAllowedDivisionsSetting} from "../UmpirePaymentAllowedDivisionsSetting";
import {UmpirePayerTypeEnum} from "../enums/UmpirePayerTypeEnum";

export class UmpirePaymentOrganiserSettingsDto {
    @IsNotEmpty()
    @IsNumber()
    umpirePayerTypeRefId: UmpirePayerTypeEnum;

    @IsArray()
    @IsOptional()
    umpirePaymentSettings: UmpirePaymentSetting[];

    @IsNotEmpty()
    allowedDivisionsSetting: UmpirePaymentAllowedDivisionsSetting;
}