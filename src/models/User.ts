import {Team} from './Team';
import {BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany} from "typeorm-plus";
import {IsBoolean, IsDate, IsNumber, IsString} from "class-validator";

/// For referring the data model of another db we are giving the
/// name as below wsa_users.<name>.
/// https://github.com/typeorm/typeorm/issues/323 as Goodmain commented on 2 Mar 2017
@Entity('wsa_users.user')
export class User extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    firstName: string;

    @IsString()
    @Column()
    lastName: string;

    @IsString()
    @Column()
    mobileNumber: string;

    @IsString()
    @Column()
    email: string;

    @IsString()
    @Column({select: false})
    password: string;

    @IsDate()
    @Column()
    dateOfBirth: Date;

    // @IsString()
    // @Column()
    // gender: string;

    @IsNumber()
    @Column()
    genderRefId: number;

    // @IsNumber()
    // @Column()
    // type: number;

    @IsString()
    @Column({select: false})
    reset: string;

    @IsBoolean()
    @Column()
    marketingOptIn: boolean;

    @IsString()
    @Column()
    photoUrl: string;

    @IsString()
    @Column()
    firebaseUID: string;

    teams: Team[];
}
