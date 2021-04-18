import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsNumber, IsString } from 'class-validator';

@Entity()
export class Watchlist extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column({ select: false })
  userId: number;

  @IsString()
  @Column({ select: false })
  deviceId: string;

  @IsNumber()
  @Column()
  entityId: number;

  @IsNumber()
  @Column()
  entityTypeId: number;
}
