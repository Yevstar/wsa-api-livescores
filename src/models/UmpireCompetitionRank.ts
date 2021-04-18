import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm-plus';
import { IsNumber } from 'class-validator';
import { Competition } from './Competition';
import { User } from './User';

@Entity({ database: 'wsa', name: 'umpire_competition_rank' })
export class UmpireCompetitionRank extends BaseEntity {
  @PrimaryColumn()
  umpireId!: number;

  @PrimaryColumn()
  competitionId!: number;

  @ManyToOne(type => User, user => user.umpireCompetitionRank)
  @JoinColumn()
  umpire: User;

  @ManyToOne(type => Competition)
  competition: Competition;

  @Column({ default: 0 })
  @IsNumber()
  rank!: number;
}
