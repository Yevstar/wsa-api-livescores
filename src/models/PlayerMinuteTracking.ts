import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm-plus';
import { Team } from './Team';
import { IsBoolean, IsDate, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Match } from './Match';
import { Player } from './Player';
import { GamePosition } from './GamePosition';

@Entity('playerMinuteTracking')
@Unique(['matchId', 'teamId', 'playerId'])
export class PlayerMinuteTracking extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn({})
  id: number;

  @IsNumber()
  @Column()
  matchId: number;

  @ValidateNested()
  @OneToOne(type => Match)
  @JoinColumn()
  match: Match;

  @IsNumber()
  @Column()
  teamId: number;

  @ValidateNested()
  @OneToOne(type => Team)
  @JoinColumn()
  team: Team;

  @IsNumber()
  @Column()
  playerId: number;

  @ValidateNested()
  @OneToOne(type => Player)
  @JoinColumn()
  player: Player;

  @IsNumber()
  @Column()
  period: number;

  @IsNumber()
  @Column()
  positionId: number;

  @ValidateNested()
  @OneToOne(type => GamePosition)
  @JoinColumn()
  position: GamePosition;

  @IsNumber()
  @Column()
  duration: number;

  @IsBoolean()
  @Column()
  playedInPeriod: boolean;

  @IsBoolean()
  @Column()
  playedEndPeriod: boolean;

  @IsBoolean()
  @Column()
  playedFullPeriod: boolean;

  @IsNumber()
  @Column()
  periodDuration: number;

  @IsString()
  @Column()
  source: String;

  @IsNumber()
  @Column()
  createdBy: number;

  @IsDate()
  @Column()
  created_at: Date;

  @IsNumber()
  @Column()
  updatedBy: number;

  @IsDate()
  @Column()
  updated_at: Date;

  @IsDate()
  @Column()
  deleted_at: Date;
}
