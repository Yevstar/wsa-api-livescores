import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from "typeorm-plus";
import {Team} from "./Team";
import {Match} from "./Match";
import {GamePosition} from "./GamePosition";
import {Player} from "./Player";
import {IsBoolean, IsDate, IsNumber, IsString, ValidateNested} from "class-validator";

@Entity("gameTimeAttendance")
export class GameTimeAttendance extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @ValidateNested()
    @OneToOne(type => Match)
    @JoinColumn()
    match: Match;

    @IsNumber()
    @Column()
    matchId: number;

    @ValidateNested()
    @OneToOne(type => Team)
    @JoinColumn()
    team: Team;

    @IsNumber()
    @Column()
    teamId: number;

    @ValidateNested()
    @OneToOne(type => Player)
    @JoinColumn()
    player: Player;

    @IsNumber()
    @Column()
    playerId: number;

    @IsNumber()
    @Column()
    period: number;

    @ValidateNested()
    @OneToOne(type => GamePosition)
    @JoinColumn()
    position: GamePosition;

    @IsNumber()
    @Column()
    positionId: number;

    @IsBoolean()
    @Column()
    isBorrowed: boolean;

    @IsBoolean()
    @Column()
    isPlaying: boolean;

    @IsString()
    @Column()
    verifiedBy: string;

    @IsString()
    @Column()
    source: String;
    
    @IsDate()
    @Column()
    createdAt: Date;

    @IsNumber()
    @Column()
    createdBy: number;

    @IsBoolean()
    @Column()
    mnbPushed: boolean;
}
