import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm-plus';
import { Competition } from './Competition';
import { IsNumber, IsString } from 'class-validator';
import { User } from './User';
import { Division } from './Division';

@Entity()
export class UmpirePool extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsString()
  name!: string;

  @ManyToMany(type => User, { eager: true })
  @JoinTable()
  umpires: User[];

  @Column()
  @IsNumber()
  competitionId!: number;

  @ManyToOne(type => Competition, competition => competition.umpirePools)
  @JoinColumn()
  competition: Competition;

  @ManyToMany(type => Division, division => division.umpirePools)
  @JoinTable()
  divisions: Division[];
}
