import {BaseEntity, Column, JoinColumn, ManyToOne} from "typeorm-plus";
import {Role} from "./security/Role";
import {UmpirePaymentFee} from "./UmpirePaymentFee";

export class UmpirePaymentFeeRate extends BaseEntity {

    @Column()
    roleId!: number;

    @ManyToOne(type => Role)
    @JoinColumn()
    role: Role;

    @Column({
        type: "float",
    })
    rate: number;

    @ManyToOne(type => UmpirePaymentFee, umpirePaymentFee => umpirePaymentFee.rates)
    umpirePaymentFee: UmpirePaymentFee;
}
