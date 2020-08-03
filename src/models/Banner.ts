import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn
} from "typeorm-plus";
import {IsBoolean, IsNumber, IsString} from "class-validator";

@Entity()
export class Banner extends BaseEntity {
    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    bannerUrl: string;

    @IsString()
    @Column()
    bannerLink: string;

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
}
