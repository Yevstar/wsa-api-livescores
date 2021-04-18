import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm-plus';
import { IsNumber, IsBoolean, IsDate, ValidateNested } from 'class-validator';
import { Match } from './Match';

@Entity('matchTimeout')
export class MatchTimeout extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  matchId: number;

  @ValidateNested()
  @ManyToOne(type => Match, match => match.matchTimeouts)
  @JoinColumn()
  match: Match;

  @IsNumber()
  @Column()
  period: number;

  @IsNumber()
  @Column()
  teamId: number;

  @IsDate()
  @Column()
  timeoutTimestamp: Date;

  @IsNumber()
  @Column()
  created_by: number;

  @IsDate()
  @Column()
  created_at: Date;

  @DeleteDateColumn({ nullable: true, default: null, name: 'deleted_at' })
  public deleted_at: Date;
}
