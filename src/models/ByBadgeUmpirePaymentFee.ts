import {UmpirePaymentFee} from "./UmpirePaymentFee";
import {Column} from "typeorm-plus";

export class ByBadgeUmpirePaymentFee extends UmpirePaymentFee {
    @Column()
    accreditationUmpireRefId: number;
}
