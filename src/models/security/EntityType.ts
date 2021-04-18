import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsDate, IsNumber, IsString } from 'class-validator';

/// For referring the data model of another db we are giving the
/// name as below wsa_users.<name>.
/// https://github.com/typeorm/typeorm/issues/323 as Goodmain commented on 2 Mar 2017
@Entity('wsa_users.entityType')
export class EntityType extends BaseEntity {
  public static COMPETITION: number = 1;
  public static ORGANISATION: number = 2;
  public static TEAM: number = 3;
  public static USER: number = 4;
  public static PLAYER: number = 5;
  public static COMPETITION_ORGANISATION: number = 6;

  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  name: string;

  @IsDate()
  @Column({ name: 'createdOn' })
  createdAt: Date;

  @IsDate()
  @Column({ name: 'updatedOn' })
  updatedAt: Date;
}
