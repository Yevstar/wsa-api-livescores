import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from 'typeorm-plus';
import {Team} from './Team';
import {IsBoolean, IsDate, IsNumber, IsString, ValidateNested} from "class-validator";
import {Match} from "./Match";
import {Player} from "./Player";

@Entity("playerMinuteTracking")
export class PlayerMinuteTracking extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn({})
    id: number;

    @IsNumber()
    @Column({select: false})
    matchId: number;

    @ValidateNested()
    @OneToOne(type => Match)
    @JoinColumn()
    match: Match;

    @IsNumber()
    @Column({select: false})
    teamId: number;

    @ValidateNested()
    @OneToOne(type => Team)
    @JoinColumn()
    team: Team;

    @IsNumber()
    @Column({select: false})
    playerId: number;

    @ValidateNested()
    @OneToOne(type => Player)
    @JoinColumn()
    player: Player;

    @IsNumber()
    @Column({select: false})
    period: number;

    @IsNumber()
    @Column({select: false})
    duration: number;

    @IsBoolean()
    @Column({select: false})
    playedFullPeriod: boolean;
}
