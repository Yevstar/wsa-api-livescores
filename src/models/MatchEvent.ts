import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm-plus';
import {IsDate, IsNumber, IsString, IsBoolean, ValidateNested} from "class-validator";
import {Match} from './Match';

@Entity('matchEvent')
export class MatchEvent extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    matchId: number;

    @ValidateNested()
    @ManyToOne(type => Match, match => match.matchEvents)
    @JoinColumn()
    match: Match;

    @IsString()
    @Column()
    eventCategory: string;

    @IsString()
    @Column()
    type: string;

    @IsDate()
    @Column()
    eventTimestamp: Date;

    @IsNumber()
    @Column()
    period: number;

    @IsString()
    @Column()
    attribute1Key: string;

    @IsString()
    @Column()
    attribute1Value: string;

    @IsString()
    @Column()
    attribute2Key: string;

    @IsString()
    @Column()
    attribute2Value: string;

    @IsNumber()
    @Column()
    userId: number;

    @IsString()
    @Column()
    source: string;

    @IsBoolean()
    @Column()
    processed: boolean;

    @IsDate()
    @Column()
    updated_at: Date;
}
