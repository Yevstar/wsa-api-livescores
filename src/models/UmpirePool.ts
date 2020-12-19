import {
    BaseEntity, Column,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn
} from "typeorm-plus";
import {Umpire} from "./Umpire";
import {Competition} from "./Competition";
import {IsNumber, IsString} from "class-validator";

@Entity()
export class UmpirePool extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsString()
    name!: string;

    @ManyToMany(type => Umpire, umpire => umpire.umpirePools)
    @JoinTable()
    umpires: Umpire[];

    @Column()
    @IsNumber()
    competitionId!: number;

    @ManyToOne(type => Competition, competition => competition.umpirePools)
    @JoinColumn()
    competition: Competition;
}