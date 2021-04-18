import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm-plus';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Competition } from '../models/Competition';
import { Organisation } from './security/Organisation';

@Entity('linkedCompetitionOrganisation')
export class LinkedCompetitionOrganisation extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  organisationId: number;

  @ManyToOne(type => Organisation)
  @JoinColumn()
  organisation: Organisation;

  @IsString()
  @Column()
  name: string;

  @IsString()
  @Column()
  logoUrl: string;

  @IsNumber()
  @Column()
  competitionId: number;

  @ValidateNested()
  @OneToOne(type => Competition)
  @JoinColumn()
  competition: Competition;
}
