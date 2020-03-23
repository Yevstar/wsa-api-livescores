import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Unique} from 'typeorm-plus';
import {Club} from "./Club";
import {Match} from "./Match";
import {IsNumber, IsString, ValidateNested} from "class-validator";

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

    @ValidateNested()
    @OneToOne(type => Club)
    @JoinColumn()
    umpire1Club: Club;

    @IsString()
    @Column()
    umpire2FullName: string;

    @IsNumber()
    @Column()
    umpire2ClubId: number;

    @IsString()
    @Column()
    umpire3FullName: string;

    @IsNumber()
    @Column()
    umpire3ClubId: number;

    @ValidateNested()
    @OneToOne(type => Club)
    @JoinColumn()
    umpire2Club: Club;

    @IsString()
    @Column()
    verifiedBy: string;
}



