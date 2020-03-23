import {Player} from './Player';
import {User} from './User';
import {Division} from './Division';
import {Competition} from './Competition';
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, DeleteDateColumn} from 'typeorm-plus';
import {Club} from "./Club";
import {IsArray, IsBoolean, IsNumber, IsString, ValidateNested} from "class-validator";

@Entity()
export class Team extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    alias: string;

    @IsNumber()
    @Column()
    divisionId: number;

    @IsString()
    @Column()
    logoUrl: string;

    @IsNumber()
    @Column()
    competitionId: number;

    @IsString()
    @Column()
    nameFilter: "SHOW" | "HIDE" | "SHOW_FIRST_NAME";

    @IsNumber()
    @Column()
    clubId: number;

    @IsNumber()
    @Column()
    organisationId: number;

    @IsBoolean()
    @Column()
    gameTimeTrackingOverride: boolean;

    @IsBoolean()
    @Column()
    positionTracking: boolean;

    @ValidateNested()
    @OneToOne(type => Competition)
    @JoinColumn()
    competition: Competition;

    @ValidateNested()
    @OneToOne(type => Club)
    @JoinColumn()
    club: Club;

    @ValidateNested()
    @ManyToOne(type => Division, division => division.teams)
    division: Division;

    @IsArray({each: true})
    @OneToMany(type => Player, player => player.team)
    players: Player[];

    @DeleteDateColumn({ nullable:true, default:null, name: 'deleted_at' })
    public deleted_at: Date;

}
