import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, DeleteDateColumn} from 'typeorm-plus';
import {MatchResultType} from "./MatchResultType";
import {Competition} from "./Competition";
import {IsNumber, IsDate} from "class-validator";

@Entity('competition_ladder_settings')
export class CompetitionLadderSettings extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(type => Competition)
    @JoinColumn()
    competition: Competition;

    @IsNumber()
    @Column()
    competitionId: number;

    @OneToOne(type => MatchResultType)
    @JoinColumn()
    resultType: MatchResultType;

    @IsNumber()
    @Column()
    resultTypeId: number;

    @IsNumber()
    @Column()
    points: number;

    @IsDate()
    @DeleteDateColumn({ nullable:true, default:null, name: 'deleted_at' })
    deleted_at: Date;
}



