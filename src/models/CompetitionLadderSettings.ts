import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from 'typeorm-plus';
import { MatchResultType } from './MatchResultType';
import { Competition } from './Competition';
import { IsNumber, IsDate } from 'class-validator';

@Entity('competition_ladder_settings')
export class CompetitionLadderSettings extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(type => Competition)
  @JoinColumn()
  competition: Competition;

  @IsNumber()
  @Column()
  competitionId: number;

  @IsNumber()
  @Column()
  ladderFormatId: number;

  @OneToOne(type => MatchResultType)
  @JoinColumn()
  resultType: MatchResultType;

  @IsNumber()
  @Column()
  resultTypeId: number;

  @IsNumber()
  @Column()
  points: number;

  @IsNumber()
  @Column()
  createdBy: number;

  @IsNumber()
  @Column({ nullable: true, default: null })
  updatedBy: number;

  @IsDate()
  @Column()
  created_at: Date;

  @IsDate()
  @Column()
  updated_at: Date;

  @IsDate()
  @DeleteDateColumn({ nullable: true, default: null, name: 'deleted_at' })
  deleted_at: Date;
}
