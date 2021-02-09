import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { JoinColumn, OneToOne } from "typeorm-plus";
import { Incident } from "../models/Incident";

@Entity("suspension")
export class Suspension extends BaseEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ nullable: true, default: null })
  suspendedFrom?: Date;

  @Column({ nullable: true, default: null })
  suspendedTo?: Date;

  @Column()
  playerId?: number;

  @Column()
  incidentId?: number;

  @OneToOne(() => Incident)
  @JoinColumn()
  incident?: Incident;

  @Column({ default: 1 })
  suspensionTypeRefId?: number;
}
