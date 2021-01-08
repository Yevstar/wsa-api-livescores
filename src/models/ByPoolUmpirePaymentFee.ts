import {UmpirePaymentFee} from "./UmpirePaymentFee";
import {Column, JoinColumn, ManyToOne} from "typeorm-plus";
import {UmpirePool} from "./UmpirePool";

export class ByPoolUmpirePaymentFee extends UmpirePaymentFee {
    @Column()
    umpirePoolId!: number;

    @ManyToOne(type => UmpirePool)
    @JoinColumn()
    umpirePool: UmpirePool;
}
