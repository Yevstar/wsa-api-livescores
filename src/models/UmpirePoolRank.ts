import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn} from "typeorm-plus";
import {IsNumber} from "class-validator";
import {User} from "./User";
import {UmpirePool} from "./UmpirePool";

@Entity({database: 'wsa', name: 'umpire_pool_rank'})
export class UmpirePoolRank extends BaseEntity {

    @PrimaryColumn()
    umpireId!: number;

    @PrimaryColumn()
    umpirePoolId!: number;

    @ManyToOne(type => User, user => user.umpireCompetitionRank)
    @JoinColumn()
    umpire: User;

    @ManyToOne(type => UmpirePool)
    umpirePool: UmpirePool;

    @Column({default: 0})
    @IsNumber()
    rank!: number;
}
