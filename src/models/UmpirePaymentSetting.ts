import {BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn} from "typeorm-plus";
import {IsBoolean, IsNumber} from "class-validator";
import {Competition} from "./Competition";
import {Division} from "./Division";

@Entity()
export class UmpirePaymentSetting extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsNumber()
    competitionId: number;

    @ManyToOne(type => Competition)
    competition: Competition;

    @Column()
    @IsBoolean()
    allDivisions: boolean;

    @ManyToMany(type => Division, division => division.umpirePaymentSettings)
    divisions: Division[]
}