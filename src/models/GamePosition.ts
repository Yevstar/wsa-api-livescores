import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsBoolean, IsNumber, IsString} from "class-validator";

@Entity("gamePosition")
export class GamePosition extends BaseEntity {

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
