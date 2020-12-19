import {BaseEntity, Column, Entity, ManyToOne, PrimaryColumn} from "typeorm-plus";
import {IsNumber} from "class-validator";
import {Umpire} from "./Umpire";
import {Competition} from "./Competition";

@Entity()
export class UmpireCompetitionRank extends BaseEntity {

    @PrimaryColumn()
    umpireId!: number;

    @PrimaryColumn()
    competitionId!: number;

    @ManyToOne(type => Umpire)
    umpire: Umpire;

    @ManyToOne(type => Competition)
    competition: Competition;

    @Column({default: 0})
    @IsNumber()
    rank!: number;
}