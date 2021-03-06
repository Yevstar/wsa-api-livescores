import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm-plus';
import { Match } from './Match';
import { IsNumber, IsString, ValidateNested, IsDate } from 'class-validator';
import { User } from './User';
import { LinkedCompetitionOrganisation } from './LinkedCompetitionOrganisation';
import { Roster } from './security/Roster';

@Entity('matchUmpire')
@Unique(['matchId'])
export class MatchUmpire extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @ValidateNested()
  @OneToOne(type => Match)
  @JoinColumn()
  match: Match;

  @IsNumber()
  @Column()
  matchId: number;

  @ValidateNested()
  @OneToOne(type => User)
  @JoinColumn()
  user: User;

  @IsNumber()
  @Column()
  userId: number;

  @IsNumber()
  @Column()
  competitionOrganisationId: number;

  @ValidateNested()
  @OneToOne(type => LinkedCompetitionOrganisation)
  @JoinColumn({ name: 'competitionOrganisationId', referencedColumnName: 'id' })
  linkedCompetitionOrganisation: LinkedCompetitionOrganisation;

  @IsString()
  @Column()
  umpireName: string;

  @IsString()
  @Column()
  umpireType: 'NAMES' | 'USERS';

  @IsNumber()
  @Column()
  sequence: number;

  @IsNumber()
  @Column()
  createdBy: number;

  @IsString()
  @Column()
  verifiedBy: string;

  @IsString()
  @Column()
  paymentStatus: 'paid' | 'approved' | 'unpaid';

  @IsDate()
  @Column()
  created_at: Date;

  @IsNumber()
  @Column()
  paidByOrgId: number;

  @IsDate()
  @Column()
  approved_at: Date;

  @IsNumber()
  @Column()
  approvedByUserId: number;

  @ValidateNested()
  @OneToOne(type => User)
  @JoinColumn()
  approvedByUser: User;

  @IsDate()
  @Column()
  updated_at: Date;

  roster: Roster;
}
