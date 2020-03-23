import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm-plus';
import { Competition } from './Competition';
import { Team } from './Team';
import { IsDate, IsNumber, IsString, ValidateNested } from "class-validator";

@Entity()
export class Player extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    firstName: string;

    @IsString()
    @Column()
    lastName: string;

    @IsString()
    @Column()
    photoUrl: string;

    @IsString()
    @Column()
    email: string;

    @IsNumber()
    @Column()
    competitionId: number;

    @IsNumber()
    @Column()
    teamId: number;

    @IsDate()
    @Column()
    dateOfBirth: Date;

    @IsString()
    @Column()
    phoneNumber: string;

    @IsString()
    @Column()
    mnbPlayerId: string;

    @IsString()
    @Column()
    nameFilter: "SHOW" | "HIDE" | "SHOW_FIRST_NAME";

    @ValidateNested()
    @OneToOne(type => Competition)
    @JoinColumn()
    competition: Competition;

    @ValidateNested()
    @ManyToOne(type => Team, (team: Team) => team.players)
    @JoinColumn()
    team: Team;

    @IsNumber()
    @Column()
    positionId: number;

    @IsString()
    @Column()
    shirt: string;

    @IsString()
    @Column()
    inviteStatus: "INVITED" | "REGISTERED";
}
