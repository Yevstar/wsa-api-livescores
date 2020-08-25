import {Team} from './Team';
import {BaseEntity, Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn} from 'typeorm-plus';
import {Competition} from "./Competition";
import {IsNumber, IsString, IsBoolean, ValidateNested} from "class-validator";

@Entity()
export class Division extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    divisionName: string;

    @IsNumber()
    @Column()
    age: number;

    @IsString()
    @Column()
    grade: string;

    @IsBoolean()
    @Column()
    positionTracking: boolean;

    @IsBoolean()
    @Column()
    recordGoalAttempts: boolean;

    @IsNumber()
    @Column()
    competitionId: number;

    @ValidateNested()
    @OneToOne(type => Competition)
    @JoinColumn()
    competition: Competition;

    @OneToMany(type => Team, team => team.division)
    teams: Promise<Team[]>;
}
