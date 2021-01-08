import {BaseEntity, Column, JoinColumn, ManyToOne, OneToMany} from "typeorm-plus";
import {UmpirePaymentFeeRate} from "./UmpirePaymentFeeRate";
import {UmpirePaymentSetting} from "./UmpirePaymentSetting";

export abstract class UmpirePaymentFee extends BaseEntity {

    @OneToMany(type => UmpirePaymentFeeRate, rate => rate.umpirePaymentFee)
    @JoinColumn()
    rates: UmpirePaymentFeeRate[];

    @Column()
    umpirePaymentSettingId!: number;

    @ManyToOne(type => UmpirePaymentSetting)
    umpirePaymentSetting: UmpirePaymentSetting;
}
