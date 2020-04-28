import {BaseEntity, Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from 'typeorm-plus';
import {IsNumber, IsBoolean, IsDate, ValidateNested} from "class-validator";
import {Match} from "./Match";

@Entity('matchPausedTime')
export class MatchPausedTime extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    matchId: number;

    @IsNumber()
    @Column()
    period: number;

    @IsBoolean()
    @Column()
    isBreak: boolean;

    @IsNumber()
    @Column()
    totalPausedMs: number;

    @IsDate()
    @Column()
    createdAt: Date;

    @ValidateNested()
    @ManyToOne(type => Match, match => match.matchPausedTimes)
    @JoinColumn()
    match: Match;
}
