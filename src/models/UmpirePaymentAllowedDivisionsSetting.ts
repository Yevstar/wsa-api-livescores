import {BaseEntity, Column, Entity, JoinColumn, ManyToMany, OneToMany, OneToOne, PrimaryColumn} from "typeorm-plus";
import {Competition} from "./Competition";
import {Division} from "./Division";

@Entity()
export class UmpirePaymentAllowedDivisionsSetting extends BaseEntity {

    @Column()
    allDivisions: boolean;

    @PrimaryColumn()
    competitionId: number;

    @OneToOne(type => Competition, competition => competition.umpirePaymentAllowedDivisionsSetting)
    @JoinColumn()
    competition: Competition;

    @ManyToMany(type => Division)
    division: Division;
}