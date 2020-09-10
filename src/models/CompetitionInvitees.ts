import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToOne } from "typeorm-plus";
import { IsNumber, ValidateNested } from "class-validator";
import { Competition } from "./Competition";

@Entity('competitionInvitees')
export class CompetitionInvitees extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    competitionId: number;

    @IsNumber()
    @Column()
    invitedOrganisationId: number;

    @IsNumber()
    @Column()
    inviteesRefId: number;

    @ValidateNested()
    @ManyToOne(type => Competition, competition => competition.competitionVenues)
    @JoinColumn()
    competition: Competition;

}
