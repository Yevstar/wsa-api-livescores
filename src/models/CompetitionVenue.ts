import {BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne} from "typeorm-plus";
import {IsNumber, ValidateNested} from "class-validator";
import {Competition} from "./Competition";
import {Venue} from "./Venue";


@Entity("competitionVenue")
export class CompetitionVenue extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    venueId: number;

    @IsNumber()
    @Column()
    competitionId: number;

    @ValidateNested()
    @ManyToOne(type => Competition, competition => competition.competitionVenues)
    @JoinColumn()
    competition: Competition;

    @ValidateNested()
    @OneToOne(type => Venue)
    @JoinColumn()
    venue: Venue;

}
