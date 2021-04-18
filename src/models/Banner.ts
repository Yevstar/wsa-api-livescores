import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

@Entity()
export class Banner extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column({ nullable: true })
  bannerUrl: string;

  @IsString()
  @Column({ nullable: true })
  bannerLink: string;

  @IsString()
  @Column({ nullable: true })
  sponsorName: string;

  @IsString()
  @Column({ nullable: true })
  horizontalBannerUrl: string;

  @IsString()
  @Column({ nullable: true })
  horizontalBannerLink: string;

  @IsString()
  @Column({ nullable: true })
  squareBannerUrl: string;

  @IsString()
  @Column({ nullable: true })
  squareBannerLink: string;

  @IsBoolean()
  @Column()
  showOnHome: boolean;

  @IsBoolean()
  @Column()
  showOnDraws: boolean;

  @IsBoolean()
  @Column()
  showOnLadder: boolean;

  @IsBoolean()
  @Column()
  showOnNews: boolean;

  @IsBoolean()
  @Column()
  showOnChat: boolean;

  @IsString()
  @Column()
  format: string;

  @IsNumber()
  @Column()
  competitionId: number;

  @IsNumber()
  @Column()
  sequence: number;

  @IsString()
  @Column()
  bannerDeletUrl: string;

  @IsNumber()
  @Column()
  organisationId: number;
}
