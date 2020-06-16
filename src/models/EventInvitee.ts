import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsNumber, IsDate} from "class-validator";

@Entity('eventInvitee')
export class EventInvitee extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    eventId: number;

    @IsNumber()
    @Column()
    entityId: number;

    @IsNumber()
    @Column()
    entityTypeId: number;

    @IsDate()
    @Column()
    deleted_at: Date;
}
