import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Unique} from 'typeorm-plus';
import {Club} from "./Club";
import {Match} from "./Match";
import {IsNumber, IsString, ValidateNested} from "class-validator";
import {User} from "./User";

@Entity('matchUmpires')
@Unique(['matchId'])
export class MatchUmpires extends BaseEntity {

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

    @IsString()
    @Column()
    umpire1FullName: string;

    @IsNumber()
    @Column()
    umpire1ClubId: number;

    @IsNumber()
    @Column()
    umpire1UserId: number;

    @IsString()
    @Column()
    umpire2FullName: string;

    @IsNumber()
    @Column()
    umpire2ClubId: number;

    @IsNumber()
    @Column()
    umpire2UserId: number;

    @IsString()
    @Column()
    umpire3FullName: string;

    @IsNumber()
    @Column()
    umpire3ClubId: number;

    @IsNumber()
    @Column()
    umpire3UserId: number;

    @ValidateNested()
    @OneToOne(type => Club)
    @JoinColumn()
    umpire1Club: Club;

    @ValidateNested()
    @OneToOne(type => Club)
    @JoinColumn()
    umpire2Club: Club;

    @ValidateNested()
    @OneToOne(type => Club)
    @JoinColumn()
    umpire3Club: Club;

    @ValidateNested()
    @OneToOne(type => User)
    @JoinColumn()
    umpire1User: User;

    @ValidateNested()
    @OneToOne(type => User)
    @JoinColumn()
    umpire2User: User;

    @ValidateNested()
    @OneToOne(type => User)
    @JoinColumn()
    umpire3User: User;

    @IsString()
    @Column()
    verifiedBy: string;
}
