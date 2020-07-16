import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsNumber, IsString} from "class-validator";

@Entity('matchSheet')
export class MatchSheet extends BaseEntity {

  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  userId: number;

  @IsString()
  @Column()
  name: String;

  @IsString()
  @Column()
  downloadUrl: String;

  @IsNumber()
  @Column()
  competitionId: number;

  @IsString()
  @Column()
  competitionName: String;

  @Column({name: 'created_at'})
  createdAt: Date;
}



