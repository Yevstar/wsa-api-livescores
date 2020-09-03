import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsNumber, IsBoolean} from "class-validator";

@Entity('matchScores')
export class MatchScores extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    userId: number;

    @IsNumber()
    @Column()
    matchId: number;

    @IsNumber()
    @Column()
    period: number;

    @IsNumber()
    @Column()
    team1Score: number;

    @IsNumber()
    @Column()
    team2Score: number;

    @Column({name: 'created_at'})
    createdAt: Date;
}
