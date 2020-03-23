import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsBoolean, IsNumber, IsString} from "class-validator";

@Entity()
export class DeepLinkPlayer extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    firstName: string;

    @IsString()
    @Column()
    lastName: string;

    @IsBoolean()
    @Column()
    isInviteToParents: boolean;

    @IsString()
    @Column()
    deepLinkVia: "SIGN_UP" | "LOG_IN";
}
