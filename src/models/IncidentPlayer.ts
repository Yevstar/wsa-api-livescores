import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToOne,
  ManyToOne,
} from 'typeorm-plus';
import { IsNumber, ValidateNested } from 'class-validator';
import { Player } from './Player';
import { Incident } from './Incident';

@Entity('incidentPlayer')
export class IncidentPlayer extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  playerId: number;

  @IsNumber()
  @Column()
  incidentId: number;

  @ValidateNested()
  @ManyToOne(type => Incident, incident => incident.incidentPlayers)
  @JoinColumn()
  incident: Incident;

  @ValidateNested()
  @OneToOne(type => Player)
  @JoinColumn()
  player: Player;

  constructor(playerId: number, incidentId: number) {
    super();
    this.playerId = playerId;
    this.incidentId = incidentId;
  }
}
