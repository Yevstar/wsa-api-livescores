import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsBoolean, IsNumber, IsString, IsDate} from "class-validator";

@Entity('eventOccurrence')
export class EventOccurrence extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    eventId: number;

    @IsBoolean()
    @Column()
    allDay: boolean;

    @IsDate()
    @Column()
    startTime: Date;

    @IsDate()
    @Column()
    endTime: Date;
    
    @IsNumber()
    @Column()
    created_by: number;
    
    @IsDate()
    @Column()
    created_at: Date;

    @IsDate()
    @Column()
    updated_at: Date;
     
    @IsDate()
    @Column()
    deleted_at: Date;
}