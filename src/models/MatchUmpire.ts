import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Unique} from 'typeorm-plus';
import {Match} from "./Match";
import {IsNumber, IsString, ValidateNested, IsDate} from "class-validator";
import {User} from "./User";
import {Organisation} from './Organisation';

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

    @ValidateNested()
    @OneToOne(type => Organisation)
    @JoinColumn()
    organisation: Organisation;

    @IsNumber()
    @Column()
    organisationId: number;

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

    @IsDate()
    @Column()
    created_at: Date;

    @IsDate()
    @Column()
    updated_at: Date;
}
