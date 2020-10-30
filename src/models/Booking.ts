import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
    DeleteDateColumn
} from "typeorm-plus";
import {IsNumber, IsDate, IsString} from "class-validator";

@Entity()
export class Booking extends BaseEntity {
    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    userId: number;

    @IsDate()
    @Column()
    startTime: Date;

    @IsDate()
    @Column()
    endTime: Date;

    @IsString()
    @Column()
    type: string;

    @IsNumber()
    @Column()
    created_by: number;

    @IsDate()
    @Column()
    created_at: Date;

    @IsDate()
    @Column()
    updated_at: Date;

    @DeleteDateColumn({ nullable:true, default:null, name: 'deleted_at' })
    public deleted_at: Date;
}
