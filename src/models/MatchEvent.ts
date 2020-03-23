import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsDate, IsNumber, IsString} from "class-validator";

@Entity('matchEvent')
export class MatchEvent extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    matchId: number;

    @IsString()
    @Column()
    eventCategory: string;

    @IsString()
    @Column()
    type: string;

    @IsDate()
    @Column()
    eventTimestamp: Date;

    @IsNumber()
    @Column()
    period: number;

    @IsString()
    @Column()
    attribute1Key: string;

    @IsString()
    @Column()
    attribute1Value: string;

    @IsString()
    @Column()
    attribute2Key: string;

    @IsString()
    @Column()
    attribute2Value: string;

    @IsNumber()
    @Column()
    userId: number;

    @IsString()
    @Column()
    source: string;
}



