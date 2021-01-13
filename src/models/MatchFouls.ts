import {
    Entity,
    BaseEntity,
    Column,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    DeleteDateColumn
} from 'typeorm-plus';
import {IsDate, IsNumber, ValidateNested} from "class-validator";
import {Match} from './Match';

@Entity('matchFouls')
export class MatchFouls extends BaseEntity {
    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    matchId: number;

    @ValidateNested()
    @OneToOne(type => Match)
    @JoinColumn({name: 'matchId', referencedColumnName: 'id'})
    match: Match;

    @IsNumber()
    @Column()
    team1Personal: number;

    @IsNumber()
    @Column()
    team1Technical: number;

    @IsNumber()
    @Column()
    team1Disqualifying: number;

    @IsNumber()
    @Column()
    team1Unsportsmanlike: number;

    @IsNumber()
    @Column()
    team2Personal: number;

    @IsNumber()
    @Column()
    team2Technical: number;

    @IsNumber()
    @Column()
    team2Disqualifying: number;

    @IsNumber()
    @Column()
    team2Unsportsmanlike: number;

    @IsNumber()
    @Column()
    created_by: number;

    @IsDate()
    @Column()
    created_at: Date;

    @IsDate()
    @Column()
    updated_at: Date;

    @DeleteDateColumn({ nullable:true, default:null, name: 'deleted_at' })
    public deleted_at: Date;
}
