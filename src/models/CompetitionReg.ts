import { IsDate, IsNumber, IsString } from "class-validator";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('competition',{ database: process.env.MYSQL_DATABASE_REG })
export class CompetitionReg extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    organisationId: number;

    @IsString()
    @Column({ nullable: true, default: null })
    name: string;

    @IsString()
    @Column({ nullable: true, default: null })
    description: string;

    @IsString()
    @Column()
    competitionUniqueKey: string;

    @IsNumber()
    @Column()
    competitionTypeRefId: number;

    @IsNumber()
    @Column()
    yearRefId: number;

    @IsNumber()
    @Column()
    competitionFormatRefId: number;

    @IsNumber()
    @Column()
    registrationRestrictionTypeRefId: number;

    @IsDate()
    @Column({ nullable: true, default: null })
    startDate: Date

    @IsDate()
    @Column({ nullable: true, default: null })
    endDate: Date

    @IsNumber()
    @Column({ nullable: true, default: null })
    noOfRounds: number;

    @IsDate()
    @Column({ nullable: true, default: null })
    registrationCloseDate: Date

    @IsNumber()
    @Column({ nullable: true, default: null })
    roundInDays: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    roundInHours: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    roundInMins: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    minimumPlayers: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    maximumPlayers: number
    
    @IsNumber()
    @Column()
    finalTypeRefId: number;

    @IsNumber()
    @Column()
    createdBy: number;

    @IsNumber()
    @Column({ nullable: true, default: null })
    updatedBy: number;

    @IsNumber()
    @Column({ default: 0 })
    isDeleted: number;

    @IsNumber()
    @Column()
    statusRefId: number;

    @IsNumber()
    @Column()
    finalsMatchTypeRefId: number;

    @IsNumber()
    @Column({ default: 0 })
    hasRegistration : number;

    @IsNumber()
    @Column()
    isSeasonalUponReg : number;

    @IsNumber()
    @Column()
    isTeamSeasonalUponReg : number;

    @IsString()
    @Column()
    seasonalSchoolRegCode: string;

    @IsString()
    @Column()
    teamSeasonalSchoolRegCode: string;

    @IsString()
    @Column()
    heroImageUrl: string;

    @IsDate()
    @Column({ nullable: true, default: null })
    updatedOn: Date;

    // @IsDate()
    // @Column({ type: 'datetime', default: () => new Date() })
    // createdOn: Date;
}
