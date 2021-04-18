import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm-plus';
import { IsBoolean, IsNumber, IsString, IsDate, ValidateNested } from 'class-validator';
import { Venue } from './Venue';
import { VenueCourt } from './VenueCourt';

@Entity()
export class Event extends BaseEntity {
  public static WEEKLY: string = 'weekly';
  public static DAILY: string = 'daily';

  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  name: string;

  @IsString()
  @Column()
  location: string;

  @IsNumber()
  @Column()
  venueId: number;

  @IsNumber()
  @Column()
  venueCourtId: number;

  @IsString()
  @Column()
  type: string;

  @IsString()
  @Column()
  description: string;

  @IsBoolean()
  @Column()
  allDay: boolean;

  @IsDate()
  @Column()
  startTime: Date;

  @IsDate()
  @Column()
  endTime: Date;

  @IsString()
  @Column()
  frequency: string;

  @IsString()
  @Column()
  repeatNumber: number;

  @IsNumber()
  @Column()
  created_by: number;

  @IsDate()
  @Column()
  created_at: Date;

  @IsDate()
  @Column()
  updated_at: Date;

  @IsDate()
  @Column()
  deleted_at: Date;

  @ValidateNested()
  @OneToOne(type => Venue)
  @JoinColumn()
  venue: Venue;

  @ValidateNested()
  @OneToOne(type => VenueCourt)
  @JoinColumn()
  venueCourt: VenueCourt;
}
