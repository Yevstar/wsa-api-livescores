import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

@Entity('lineup')
export class Lineup extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  matchId: number;

  @IsNumber()
  @Column()
  competitionId: number;

  @IsNumber()
  @Column()
  teamId: number;

  @IsNumber()
  @Column()
  playerId: number;

  @IsNumber()
  @Column()
  positionId: number;

  @IsString()
  @Column()
  shirt: string;

  @IsNumber()
  @Column()
  xCoordinate: number;

  @IsNumber()
  @Column()
  yCoordinate: number;

  @IsBoolean()
  @Column()
  playing: boolean;

  @IsBoolean()
  @Column()
  borrowed: boolean;

  @IsString()
  @Column()
  verifiedBy: string;
}
