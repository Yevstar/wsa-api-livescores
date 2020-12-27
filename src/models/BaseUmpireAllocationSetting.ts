import {BaseEntity, Column, JoinTable, ManyToMany, PrimaryGeneratedColumn} from "typeorm-plus";
import {IsBoolean} from "class-validator";
import {Division} from "./Division";

export class BaseUmpireAllocationSetting extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({default: false})
    @IsBoolean()
    allDivisions: boolean;

    @ManyToMany(type => Division, division => division.umpireAllocationSettings)
    @JoinTable()
    divisions: Division[];

    @Column()
    competitionId!: number;
}