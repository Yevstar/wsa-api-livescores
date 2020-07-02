import {ViewColumn, ViewEntity, Entity, Column, PrimaryGeneratedColumn, DeleteDateColumn, BaseEntity} from "typeorm-plus";
import {IsNumber, IsString, IsDate} from "class-validator";

@Entity("teamLadder")
export class TeamLadder  extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    matchId: number;

    @IsNumber()
    @Column()
    teamId: number;

    @IsNumber()
    @Column()
    divisionId: number;

    @IsNumber()
    @Column()
    competitionId: number;

    @IsNumber()
    @Column()
    teamLadderTypeRefId: number;

    @IsNumber()
    @Column()
    teamLadderTypeValue: number;

    @IsNumber()
    @Column()
    createdBy: number;

    @IsNumber()
    @Column({ nullable: true, default: null })
    updatedBy: number;

    @IsDate()
    @Column()
    created_at: Date;

    @IsDate()
    @Column()
    updated_at: Date;

    @DeleteDateColumn({ nullable:true, default:null, name: 'deleted_at' })
    public deleted_at: Date;

}
