import {
    BaseEntity,
    Column,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn
} from "typeorm-plus";
import { IsNumber } from "class-validator";
import {Competition} from "./Competition";
import {Organisation} from "./security/Organisation";

@Entity('competitionOrganisation')
export class CompetitionOrganisation extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    orgId: number;

    @IsNumber()
    @Column()
    competitionId: number;

    @ManyToOne(type => Competition, competition => competition.competitionOrganizations)
    competition: Competition;

    @DeleteDateColumn({ nullable: true, default: null, name: 'deleted_at' })
    public deleted_at: Date;

    @ManyToOne(() => Organisation)
    @JoinColumn({ name: 'orgId' })
    organisation: Organisation;
}
