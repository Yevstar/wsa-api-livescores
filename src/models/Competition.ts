import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, OneToMany, DeleteDateColumn} from "typeorm-plus";
import {Location} from "./Location";
import {CompetitionVenue} from "./CompetitionVenue";
import {IsBoolean, IsNumber, IsString, ValidateNested} from "class-validator";

@Entity()
export class Competition extends BaseEntity {

    public static AFFILIATED_ASSOCIATION: number = 2;
    public static AFFILIATED_CLUB: number = 3;
    public static DIRECT_INVITE: number = 5;
    public static ANY_ORGANISATION_ASSOCIATION: number = 7;
    public static ANY_ORGANISATION_CLUB: number = 8;

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

    @DeleteDateColumn({ nullable:true, default:null, name: 'deleted_at' })
    public deleted_at: Date;

}
