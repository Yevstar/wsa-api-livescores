import { BaseEntity, Column, Entity, DeleteDateColumn, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsDate, IsNumber } from 'class-validator';

@Entity('ladderFormatDivision')
export class LadderFormatDivision extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  ladderFormatId: number;

  @IsNumber()
  @Column()
  divisionId: number;

  @IsNumber()
  @Column()
  createdBy: number;

  @IsNumber()
  @Column({ nullable: true, default: null })
  updatedBy: number;

  @IsDate()
  @Column()
  created_at: Date;

  @IsDate()
  @Column()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true, default: null, name: 'deleted_at' })
  public deleted_at: Date;
}
