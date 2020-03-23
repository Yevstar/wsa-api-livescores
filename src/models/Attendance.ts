import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from "typeorm-plus";
import {Team} from "./Team";
import {Match} from "./Match";
import {IsBoolean, IsDate, IsNumber, IsString, ValidateNested} from "class-validator";

@Entity()
export class Attendance extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    matchId: number;

    @IsString()
    @Column()
    key: string;

    @IsString()
    @Column()
    teamId: number;

    @IsString()
    @Column()
    playerIdsJson: string;

    @IsDate()
    @Column()
    createdAt: Date;

    @IsString()
    @Column()
    createdBy: string;

    @ValidateNested()
    @OneToOne(type => Match)
    @JoinColumn()
    match: Match;

    @ValidateNested()
    @OneToOne(type => Team)
    @JoinColumn()
    Team: Team;

    @IsBoolean()
    @Column()
    mnbPushed: boolean;
}
