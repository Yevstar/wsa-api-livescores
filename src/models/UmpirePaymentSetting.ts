import {BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm-plus";
import {IsBoolean, IsNumber} from "class-validator";
import {UmpirePayerTypeEnum} from "./enums/UmpirePayerTypeEnum";
import {Competition} from "./Competition";

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
    @IsNumber()
    umpirePayerTypeRefId: UmpirePayerTypeEnum;

    @Column()
    @IsBoolean()
    allDivisions: boolean;
}