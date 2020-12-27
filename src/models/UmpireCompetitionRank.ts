import {BaseEntity, Column, Entity, ManyToOne, PrimaryColumn} from "typeorm-plus";
import {IsNumber} from "class-validator";
import {Competition} from "./Competition";
import {User} from "./User";

@Entity()
export class UmpireCompetitionRank extends BaseEntity {

    @PrimaryColumn()
    umpireId!: number;

    @PrimaryColumn()
    competitionId!: number;

    @ManyToOne(type => User)
    umpire: User;

    @ManyToOne(type => Competition)
    competition: Competition;

    @Column({default: 0})
    @IsNumber()
    rank!: number;
}