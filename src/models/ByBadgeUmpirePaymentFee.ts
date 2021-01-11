import {UmpirePaymentFee} from "./UmpirePaymentFee";
import {ChildEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany} from "typeorm";
import {UmpirePaymentFeeRate} from "./UmpirePaymentFeeRate";
import {UmpirePaymentSetting} from "./UmpirePaymentSetting";

@Entity()
export class ByBadgeUmpirePaymentFee extends UmpirePaymentFee {
    @Column()
    accreditationUmpireRefId: number;

    @OneToMany(type => UmpirePaymentFeeRate, rate => rate.umpirePaymentFeeByBadge, {
        eager: true
    })
    @JoinColumn()
    rates: UmpirePaymentFeeRate[];

    @ManyToOne(type => UmpirePaymentSetting, umpirePaymentSetting => umpirePaymentSetting.byBadge)
    @JoinColumn()
    umpirePaymentSetting: UmpirePaymentSetting;
}
