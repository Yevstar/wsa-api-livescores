import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, DeleteDateColumn, OneToMany} from 'typeorm-plus';
import {Team} from './Team';
import {VenueCourt} from './VenueCourt';
import {Competition} from './Competition';
import {Division} from './Division';
import {MatchResultType} from "./MatchResultType";
import {Round} from "./Round";
import {IsBoolean, IsDate, IsNumber, IsString, ValidateNested, IsArray} from "class-validator";
import { isDate } from 'util';
import {MatchPausedTime} from "./MatchPausedTime";
import {Roster} from "./security/Roster";
import { MatchUmpire } from './MatchUmpire';
import { MatchFouls } from './MatchFouls';
import { MatchTimeout } from './MatchTimeout';

@Entity()
export class Match extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    team1Score: number;

    @IsNumber()
    @Column()
    team2Score: number;

    @IsNumber()
    @Column()
    venueCourtId: number;

    @IsNumber()
    @Column()
    competitionId: number;

    @IsNumber()
    @Column()
    divisionId: number;

    @IsNumber()
    @Column()
    team1Id: number;

    @IsNumber()
    @Column()
    team2Id: number;

    @IsDate()
    @Column()
    startTime: Date;

    @IsString()
    @Column()
    type: "FOUR_QUARTERS" | "TWO_HALVES" | "SINGLE_PERIOD";

    @IsNumber()
    @Column()
    matchDuration: number;

    @IsNumber()
    @Column()
    breakDuration: number;

    @IsNumber()
    @Column()
    mainBreakDuration: number;

    @IsString()
    @Column()
    scorerStatus: "SCORER1" | "SCORER2";

    @ValidateNested()
    @OneToOne(type => Competition)
    @JoinColumn()
    competition: Competition;

    @ValidateNested()
    @OneToOne(type => Division)
    @JoinColumn()
    division: Division;

    @ValidateNested()
    @OneToOne(type => VenueCourt)
    @JoinColumn()
    venueCourt: VenueCourt;

    @ValidateNested()
    @OneToOne(type => Team)
    @JoinColumn()
    team1: Team;

    @ValidateNested()
    @OneToOne(type => Team)
    @JoinColumn()
    team2: Team;

    @IsString()
    @Column()
    mnbMatchId: string;

    @IsBoolean()
    @Column()
    mnbPushed: boolean;

    @IsBoolean()
    @Column()
    matchEnded: boolean;

    @IsString()
    @Column()
    matchStatus: "STARTED" | "PAUSED" | "ENDED";

    @IsDate()
    @Column()
    endTime: Date;

    @ValidateNested()
    @OneToOne(type => MatchResultType)
    @JoinColumn()
    team1Result: MatchResultType;

    @IsNumber()
    @Column()
    team1ResultId: number;

    @ValidateNested()
    @OneToOne(type => MatchResultType)
    @JoinColumn()
    team2Result: MatchResultType;

    @IsNumber()
    @Column()
    team2ResultId: number;

    @ValidateNested()
    @ManyToOne(type => Round, round => round.matches)
    @JoinColumn()
    round: Round;

    @IsNumber()
    @Column()
    roundId: number;

    @IsDate()
    @Column()
    originalStartTime: Date;

    @IsDate()
    @Column()
    pauseStartTime: Date;

    @IsNumber()
    @Column()
    totalPausedMs: number;

    @IsString()
    @Column()
    centrePassStatus: "TEAM1" | "TEAM2";

    @IsString()
    @Column()
    centrePassWonBy: "TEAM1" | "TEAM2";

    @DeleteDateColumn({ nullable:true, default:null, name: 'deleted_at' })
    public deleted_at: Date;

    @IsDate()
    @Column()
    created_at: Date;

    @IsDate()
    @Column()
    updated_at: Date;

    @IsString()
    @Column()
    livestreamURL: string;

    @IsString()
    @Column()
    resultStatus: "Draft" | "Unconfirmed" | "In Dispute" | "Final";

    @ValidateNested()
    @OneToMany(type => MatchPausedTime, matchPausedTime => matchPausedTime.match)
    @JoinColumn()
    matchPausedTimes: MatchPausedTime[];

    @IsDate()
    @Column()
    extraStartTime: Date;

    @IsDate()
    @Column()
    extraExtraStartTime: Date;

    @IsNumber()
    @Column()
    extraTimeDuration: number;

    @IsNumber()
    @Column()
    extraTimeBreak: number;

    @IsNumber()
    @Column()
    extraTimeMainBreak: number;

    @IsString()
    @Column()
    extraTimeType: "FOUR_QUARTERS" | "TWO_HALVES" | "SINGLE_PERIOD";

    @IsBoolean()
    @Column()
    isFinals: boolean;

    @IsNumber()
    @Column()
    extraTimeWinByGoals: number;

    @ValidateNested()
    @OneToOne(type => MatchFouls)
    @JoinColumn({name: 'id', referencedColumnName: 'matchId'})
    matchFouls: MatchFouls;

    @ValidateNested()
    @OneToMany(type => MatchTimeout, matchTimeout => matchTimeout.match)
    @JoinColumn()
    matchTimeouts: MatchTimeout[];

    rosters: Roster[];
    matchUmpires: MatchUmpire[];
}
