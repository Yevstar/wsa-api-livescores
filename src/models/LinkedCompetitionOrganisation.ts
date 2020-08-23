import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsNumber, IsString} from "class-validator";

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
}