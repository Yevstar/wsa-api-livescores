import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import {IsNumber, IsString, IsDate} from "class-validator";

@Entity('wsa_common.stateTimezone')
export class StateTimezone extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    stateRefId: number;

    @IsString()
    @Column()
    timezone: string;

    @IsNumber()
    @Column()
    created_by: number;

    @IsDate()
    @Column()
    created_at: Date;

    @IsDate()
    @Column({ nullable: true })
    updated_at: Date;

    @IsNumber()
    @Column({ default: 0 })
    isDeleted: number;
}
