import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from 'typeorm-plus';
import { IsNumber, IsString, IsBoolean, IsDate, IsArray } from 'class-validator';

@Entity()
export class News extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  author: String;

  @IsString()
  @Column()
  title: String;

  @IsString()
  @Column()
  newsImage: String;

  @IsString()
  @Column()
  newsVideo: String;

  @IsString()
  @Column()
  deleteNewsImage: String;

  @IsString()
  @Column()
  deleteNewsVideo: String;

  @IsBoolean()
  @Column()
  isActive: boolean;

  @IsBoolean()
  @Column()
  isNotification: boolean;

  @IsString()
  @Column()
  body: String;

  @IsDate()
  @Column()
  created_at: Date;

  @IsDate()
  @Column()
  updated_at: Date;

  @IsDate()
  @Column()
  published_at: Date;

  @IsDate()
  @DeleteDateColumn({ nullable: true, default: null, name: 'deleted_at' })
  deleted_at: Date;

  @IsNumber()
  @Column()
  entityId: number;

  @IsNumber()
  @Column()
  entityTypeId: number;

  @IsDate()
  @Column()
  news_expire_date: Date;

  @IsString()
  @Column()
  toUserRoleIds: string;

  @IsString()
  @Column()
  toRosterRoleIds: string;

  @IsString()
  @Column({ nullable: true, default: null })
  recipients: string;

  @IsNumber()
  @Column({ nullable: true, default: null })
  recipientRefId: number;

  @IsString()
  @Column()
  toUserIds: string;
}
