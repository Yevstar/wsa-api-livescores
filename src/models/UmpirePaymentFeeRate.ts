import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {ByPoolUmpirePaymentFee} from "./ByPoolUmpirePaymentFee";
import {ByBadgeUmpirePaymentFee} from "./ByBadgeUmpirePaymentFee";
import {Role} from "./security/Role";
import {BeforeInsert, BeforeUpdate} from "typeorm-plus";
import {BadRoleInsertError} from "../exceptions/BadRoleInsertError";

@Entity()
export class UmpirePaymentFeeRate extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    roleId!: number;

    @ManyToOne(type => Role, {
        eager: true
    })
    @JoinColumn()
    role: Role;

    @Column({
        type: "float",
    })
    rate: number;

    @Column()
    umpirePaymentFeeByPoolId: number;

    @Column()
    umpirePaymentFeeByBadgeId: number;

    @ManyToOne(type => ByPoolUmpirePaymentFee, umpirePaymentFee => umpirePaymentFee.rates)
    umpirePaymentFeeByPool: ByPoolUmpirePaymentFee;

    @ManyToOne(type => ByBadgeUmpirePaymentFee, umpirePaymentFee => umpirePaymentFee.rates)
    umpirePaymentFeeByBadge: ByBadgeUmpirePaymentFee;

    @BeforeInsert()
    @BeforeUpdate()
    checkRole() {
        if (Role.UMPIRE_COACH !== this.roleId && Role.UMPIRE !== this.roleId && Role.UMPIRE_RESERVE !== this.roleId) {
            throw new BadRoleInsertError;
        }
    }
}
