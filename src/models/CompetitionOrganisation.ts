import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm-plus";
import { IsNumber } from "class-validator";

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
}
