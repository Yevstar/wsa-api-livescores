import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToOne,
    JoinColumn,
    DeleteDateColumn
} from 'typeorm-plus';
import {IsNumber, IsBoolean, IsDate, ValidateNested} from "class-validator";
import {Match} from "./Match";
import {Player} from "./Player";
import {MatchEvent} from "./MatchEvent";

@Entity('matchSinBin')
export class MatchSinBin extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    matchEventId: number;

    @ValidateNested()
    @OneToOne(type => MatchEvent)
    @JoinColumn()
    matchEvent: MatchEvent;

    @IsNumber()
    @Column()
    matchId: number;

    @ValidateNested()
    @ManyToOne(type => Match, match => match.matchSinBins)
    @JoinColumn()
    match: Match;

    @IsNumber()
    @Column()
    teamId: number;

    @IsNumber()
    @Column()
    playerId: number;

    @ValidateNested()
    @OneToOne(type => Player)
    @JoinColumn()
    player: Player;

    @IsNumber()
    @Column()
    totalPausedMs: number;

    @IsNumber()
    @Column()
    created_by: number;

    @IsDate()
    @Column()
    created_at: Date;

    @DeleteDateColumn({ nullable:true, default:null, name: 'deleted_at' })
    public deleted_at: Date;
}
