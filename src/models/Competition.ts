import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, OneToMany, DeleteDateColumn} from "typeorm-plus";
import {Location} from "./Location";
import {CompetitionVenue} from "./CompetitionVenue";
import {LinkedCompetitionOrganisation} from "./LinkedCompetitionOrganisation";
import {IsBoolean, IsNumber, IsString, ValidateNested} from "class-validator";
import { CompetitionInvitees } from "./CompetitionInvitees";
import {UmpireCompetitionRank} from "./UmpireCompetitionRank";
import {UmpirePool} from "./UmpirePool";

@Entity()
export class Competition extends BaseEntity {

    public static AFFILIATED_ASSOCIATION: number = 2;
    public static AFFILIATED_CLUB: number = 3;
    public static DIRECT_INVITE: number = 5;
    public static ANY_ORGANISATION_ASSOCIATION: number = 7;
    public static ANY_ORGANISATION_CLUB: number = 8;
    public static NOT_APPLICABLE: number = 6;

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    uniqueKey: string;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    longName: string;

    @IsString()
    @Column()
    logoUrl: string;

    @IsNumber()
    @Column()
    organisationId: number;

    @ValidateNested()
    @OneToOne(type => LinkedCompetitionOrganisation)
    @JoinColumn({name: 'organisationId', referencedColumnName: 'organisationId'})
    linkedCompetitionOrganisation: LinkedCompetitionOrganisation;

    @IsNumber()
    @Column()
    recordUmpire: number;

    @IsString()
    @Column()
    recordUmpireType: "NONE" | "NAMES" | "USERS";

    @IsBoolean()
    @Column()
    gameTimeTracking: boolean;

    @IsBoolean()
    @Column()
    positionTracking: boolean;

    @IsBoolean()
    @Column()
    uploadScores: boolean;

    @IsBoolean()
    @Column()
    uploadAttendance: boolean;

    @IsString()
    @Column()
    scoringType: "SINGLE" | "50_50" | "SIMULTANEOUS";

    @IsString()
    @Column()
    attendanceRecordingType: "OWN" | "OPPOSITION" | "BOTH";

    @IsString()
    @Column()
    timerType: "CENTRAL" | "PER_MATCH" | "CENTRAL_WITH_MATCH_OVERRIDE";

    @IsString()
    @Column()
    attendanceRecordingPeriod: "PERIOD" | "MINUTE" | "MATCH";

    @IsString()
    @Column({select: false})
    mnbUser: string;

    @IsString()
    @Column({select: false})
    mnbPassword: string;

    @IsString()
    @Column({select: false})
    mnbUrl: string;

    @IsNumber()
    @Column()
    locationId: number;

    @ValidateNested()
    @OneToOne(type => Location)
    @JoinColumn()
    location: Location;

    @ValidateNested()
    @OneToMany(type => CompetitionVenue, competitionVenue => competitionVenue.competition)
    @JoinColumn()
    competitionVenues: CompetitionVenue[];

    @IsString()
    @Column()
    softBuzzerUrl: string;

    @IsString()
    @Column()
    hardBuzzerUrl: string;

    @IsBoolean()
    @Column()
    recordGoalAttempts: boolean;

    @IsBoolean()
    @Column()
    centrePassEnabled: boolean;

    @IsNumber()
    @Column()
    lineupSelectionTime: number;

    @IsNumber()
    @Column()
    attendanceSelectionTime: number;

    @IsBoolean()
    @Column()
    lineupSelectionEnabled: boolean;

    @IsNumber()
    @Column()
    lineupMaxPlayers: number;

    @IsBoolean()
    @Column()
    incidentsEnabled: boolean;

    @IsBoolean()
    @Column()
    buzzerEnabled: boolean;

    @IsBoolean()
    @Column()
    warningBuzzerEnabled: boolean;

    @IsString()
    @Column()
    playerBorrowingType: "GAMES" | "MINUTES";

    @IsNumber()
    @Column()
    gamesBorrowedThreshold: number;

    @IsNumber()
    @Column()
    linkedCompetitionId: number;

    @DeleteDateColumn({ nullable:true, default:null, name: 'deleted_at' })
    public deleted_at: Date;

    @IsNumber()
    @Column()
    yearRefId: number;

    @ValidateNested()
    @OneToMany(type => CompetitionInvitees, competitionInvitee => competitionInvitee.competition)
    @JoinColumn()
    competitionInvitees: CompetitionInvitees[];

    @IsNumber()
    @Column()
    gameTimeTrackingType: number;

    @IsNumber()
    @Column()
    sourceId: number;

    @OneToMany(type => UmpireCompetitionRank, umpireRank => umpireRank.competition)
    umpireRanks: UmpireCompetitionRank[];

    @OneToMany(type => UmpirePool, umpirePool => umpirePool.competition)
    umpirePools: UmpirePool[];
}
