import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from "typeorm-plus";
import {Role} from "./Role";
import {Match} from "../Match";
import {Team} from "../Team";
import {User} from "../User";
import {IsNumber} from "class-validator";

@Entity()
export class Roster extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(type => Role)
    @JoinColumn()
    role: Role;

    @IsNumber()
    @Column()
    roleId: number;

    @OneToOne(type => Match)
    @JoinColumn()
    match: Match;

    @IsNumber()
    @Column()
    matchId: number;

    @OneToOne(type => Team)
    @JoinColumn()
    team: Team;

    @IsNumber()
    @Column()
    teamId: number;

    @OneToOne(type => User)
    @JoinColumn()
    user: User;

    @IsNumber()
    @Column()
    userId: number;

    @Column()
    status: "YES" | "NO" | "LATER" | "MAYBE";

}
