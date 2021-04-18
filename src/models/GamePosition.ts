import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

@Entity('gamePosition')
export class GamePosition extends BaseEntity {
  public static GOAL_SHOOTER: number = 1;
  public static GOAL_ATTACK: number = 2;

  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  name: string;

  @IsBoolean()
  @Column()
  isPlaying: boolean;

  @IsBoolean()
  @Column()
  isVisible: boolean;
}
