import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsNumber, IsString, IsBoolean } from 'class-validator';

@Entity('incidentType')
export class IncidentType extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  name: string;

  @IsString()
  @Column()
  icon: string;

  @IsNumber()
  @Column()
  sequence: number;

  @IsBoolean()
  @Column()
  isPlayer: boolean;
}
