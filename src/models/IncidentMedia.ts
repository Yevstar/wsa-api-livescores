import {BaseEntity, Column, Entity, PrimaryGeneratedColumn, JoinColumn, ManyToOne} from 'typeorm-plus';
import {IsDate, IsNumber, IsString, ValidateNested} from "class-validator";
import {Incident} from './Incident';

@Entity("incidentMedia")
export class IncidentMedia extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    incidentId: number;

    @IsString()
    @Column()
    mediaUrl: string;

    @IsString()
    @Column()
    mediaType: string;

    @IsNumber()
    @Column()
    userId: number;

    @IsDate()
    @Column()
    createdAt: Date;
    
    @ValidateNested()
    @ManyToOne(type => Incident, (incident: Incident) => incident.incidentMediaList)
    @JoinColumn()
    incident: Incident;
}
