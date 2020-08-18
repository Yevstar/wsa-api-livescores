import {BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn} from 'typeorm-plus';
import {IsBoolean, IsNumber, IsString, ValidateNested} from "class-validator";
import {User} from "./User";

@Entity()
export class DeepLinkPlayer extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    userId: number;

    @ValidateNested()
    @OneToOne(type => User)
    @JoinColumn()
    user: User;

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
