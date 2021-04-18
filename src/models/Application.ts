import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

@Entity('application_version')
export class Application extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  platform: 'android' | 'ios';

  @IsString()
  @Column()
  minSupportVersion: string;

  @IsString()
  @Column()
  maxSupportVersion: string;

  @IsBoolean()
  @Column()
  active: boolean;

  @IsString()
  @Column()
  updateMessage: string;

  @IsString()
  @Column()
  applicationUrl: string;
}
