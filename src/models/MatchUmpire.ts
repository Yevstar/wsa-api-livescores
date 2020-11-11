import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Unique} from 'typeorm-plus';
import {Match} from "./Match";
import {IsNumber, IsString, ValidateNested, IsDate} from "class-validator";
import {User} from "./User";
import {LinkedCompetitionOrganisation} from './LinkedCompetitionOrganisation';
import {Roster} from "./security/Roster";

@Entity('matchUmpire')
@Unique(['matchId'])
export class MatchUmpire extends BaseEntity {

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
    @OneToOne(type => User)
    @JoinColumn()
    user: User;

    @IsNumber()
    @Column()
    userId: number;

    @IsNumber()
    @Column()
    organisationId: number;

    @ValidateNested()
    @OneToOne(type => LinkedCompetitionOrganisation)
    @JoinColumn({name: 'organisationId', referencedColumnName: 'id'})
    competitionOrganisation: LinkedCompetitionOrganisation;

    @IsString()
    @Column()
    umpireName: string;

    @IsString()
    @Column()
    umpireType: "NAMES" | "USERS";

    @IsNumber()
    @Column()
    sequence: number;

    @IsNumber()
    @Column()
    createdBy: number;

    @IsString()
    @Column()
    verifiedBy: string;

    @IsString()
    @Column()
    paymentStatus: "paid" | "approved" | "unpaid";

    @IsDate()
    @Column()
    created_at: Date;

    @IsDate()
    @Column()
    updated_at: Date;

    roster: Roster;
}
