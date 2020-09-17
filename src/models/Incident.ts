import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, JoinColumn, OneToMany, OneToOne, DeleteDateColumn } from 'typeorm-plus';
import {IsArray, IsDate, IsNumber, IsString, ValidateNested} from "class-validator";
import {IncidentType} from './IncidentType';
import {IncidentPlayer} from './IncidentPlayer';
import {IncidentMedia} from './IncidentMedia';
import {Match} from './Match';

@Entity("incident")
export class Incident extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    guid: string;

    @IsNumber()
    @Column()
    matchId: number;

    @IsNumber()
    @Column()
    teamId: number;

    @IsNumber()
    @Column()
    competitionId: number;

    @IsNumber()
    @Column()
    incidentTypeId: number;

    @IsString()
    @Column()
    description: string;

    @IsDate()
    @Column()
    incidentTime: Date;

    @IsDate()
    @Column()
    createdAt: Date;

    @IsDate()
    @Column()
    updated_at: Date;

    @ValidateNested()
    @OneToOne(type => IncidentType)
    @JoinColumn()
    incidentType: IncidentType;

    @ValidateNested()
    @OneToOne(type => Match)
    @JoinColumn()
    match: Match;

    @IsArray({each: true})
    @OneToMany(type => IncidentPlayer, incidentPlayer => incidentPlayer.incident)
    incidentPlayers: IncidentPlayer[];

    @IsArray({each: true})
    @OneToMany(type => Match, match => match.round)
    matches: Match[];

    @IsArray({each: true})
    @OneToMany(type => IncidentMedia, incidentMedia => incidentMedia.incident)
    incidentMediaList: IncidentMedia[];

    @IsDate()
    @DeleteDateColumn({ nullable: true, default: null, name: 'deleted_at' })
    deleted_at: Date;

}
