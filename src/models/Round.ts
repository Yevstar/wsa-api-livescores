import {BaseEntity, Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn} from 'typeorm-plus';
import {Competition} from "./Competition";
import {Division} from "./Division";
import {Match} from "./Match";
import {IsArray, IsNumber, IsString, ValidateNested} from "class-validator";

@Entity()
export class Round extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsNumber()
    @Column()
    sequence: number;

    @IsNumber()
    @Column()
    competitionId: number;

    @ValidateNested()
    @OneToOne(type => Competition)
    @JoinColumn()
    competition: Competition;

    @IsNumber()
    @Column()
    divisionId: number;

    @ValidateNested()
    @OneToOne(type => Division)
    @JoinColumn()
    division: Division;

    @IsArray({each: true})
    @OneToMany(type => Match, match => match.round)
    matches: Match[];
}
