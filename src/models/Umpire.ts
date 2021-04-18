import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm-plus';
import { User } from './User';
import { IsNumber } from 'class-validator';
import { UmpireCompetitionRank } from './UmpireCompetitionRank';
import { UmpirePool } from './UmpirePool';

@Entity()
export class Umpire extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNumber()
  userId!: number;

  @OneToOne(type => User)
  @JoinColumn()
  user: User;

  @Column()
  @IsNumber()
  accreditationUmpireRefId!: number;

  @Column({ nullable: true })
  @IsNumber()
  yearsUmpired?: number;

  @Column({ nullable: true })
  @IsNumber()
  numberOfGames?: number;

  @OneToMany(type => UmpireCompetitionRank, competitionRank => competitionRank.umpire)
  competitionRanks: UmpireCompetitionRank[];

  @ManyToMany(type => UmpirePool, umpirePool => umpirePool.umpires)
  umpirePools: UmpirePool[];
}
