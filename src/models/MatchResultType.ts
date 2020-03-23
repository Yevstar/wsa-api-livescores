import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsNumber, IsString} from "class-validator";

@Entity('matchResultType')
export class MatchResultType extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    code: string;
}



