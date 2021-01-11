import {UmpirePaymentFee} from "./UmpirePaymentFee";
import {Column, Entity, JoinColumn, ManyToOne, OneToMany} from "typeorm";
import {UmpirePool} from "./UmpirePool";
import {UmpirePaymentFeeRate} from "./UmpirePaymentFeeRate";
import {UmpirePaymentSetting} from "./UmpirePaymentSetting";

@Entity()
export class ByPoolUmpirePaymentFee extends UmpirePaymentFee {
    @Column()
    umpirePoolId!: number;

    @ManyToOne(type => UmpirePool, {
        eager: true
    })
    @JoinColumn()
    umpirePool: UmpirePool;

    @OneToMany(type => UmpirePaymentFeeRate, rate => rate.umpirePaymentFeeByPool, {
        eager: true
    })
    @JoinColumn()
    rates: UmpirePaymentFeeRate[];

    @ManyToOne(type => UmpirePaymentSetting, umpirePaymentSetting => umpirePaymentSetting.byPool)
    @JoinColumn()
    umpirePaymentSetting: UmpirePaymentSetting;
}
