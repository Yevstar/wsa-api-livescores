import {BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn} from 'typeorm-plus';
import {IsNumber, IsString, ValidateNested} from "class-validator";
import {Competition} from '../models/Competition';

@Entity('linkedCompetitionOrganisation')
export class LinkedCompetitionOrganisation extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    organisationId: number;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    logoUrl: string;

    @IsNumber()
    @Column()
    competitionId: number;

    @ValidateNested()
    @OneToOne(type => Competition)
    @JoinColumn()
    competition: Competition;
}
