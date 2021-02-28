import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, JoinColumn, OneToMany, OneToOne, DeleteDateColumn } from 'typeorm-plus';
import {IsArray, IsDate, IsNumber, IsString, ValidateNested} from "class-validator";
import {IncidentType} from './IncidentType';
import {IncidentPlayer} from './IncidentPlayer';
import {IncidentMedia} from './IncidentMedia';
import {Match} from './Match';
import {Competition} from './Competition';
import {User} from "./User";

@Entity("incident")
export class Incident extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    guid?: string;

    @IsNumber()
    @Column()
    matchId: number;

    @IsNumber()
    @Column()
    userId?: number;

    @IsNumber()
    @Column()
    teamId?: number;

    @IsNumber()
    @Column()
    competitionId?: number;

    @ValidateNested()
    @OneToOne(type => Competition)
    @JoinColumn()
    competition?: Competition;

    @IsNumber()
    @Column()
    incidentTypeId?: number;

    @IsString()
    @Column()
    description?: string;

    @IsDate()
    @Column()
    incidentTime?: Date;

    @IsDate()
    @Column()
    createdAt?: Date;

    @IsDate()
    @Column()
    updated_at?: Date;

    @ValidateNested()
    @OneToOne(type => IncidentType)
    @JoinColumn()
    incidentType?: IncidentType;

    @ValidateNested()
    @OneToOne(type => Match)
    @JoinColumn()
    match?: Match;

    @IsArray({each: true})
    @OneToMany(type => IncidentPlayer, incidentPlayer => incidentPlayer.incident)
    incidentPlayers?: IncidentPlayer[];

    @IsArray({each: true})
    @OneToMany(type => Match, match => match.round)
    matches?: Match[];

    @IsArray({each: true})
    @OneToMany(type => IncidentMedia, incidentMedia => incidentMedia.incident)
    incidentMediaList?: IncidentMedia[];

    @IsDate()
    @DeleteDateColumn({ nullable: true, default: null, name: 'deleted_at' })
    deleted_at?: Date;

    @ValidateNested()
    @OneToOne(type => User)
    @JoinColumn()
    foulUser?: User;

    @IsNumber()
    @Column()
    foulUserId?: number

    @IsString()
    @Column()
    foulPlayerRole?: string;

    @IsArray()
    @Column("json")
    offences?: Record<string, any>[];

    @IsArray()
    @Column("json")
    clarifyingQuestions?: Record<string, any>[];

    @IsArray()
    @Column("json")
    witnesses?: Record<string, any>[];
}
