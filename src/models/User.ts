import {Team} from './Team';
import {Organisation} from './Organisation';
import {UserRoleEntity} from './security/UserRoleEntity';
import {BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany} from "typeorm-plus";
import {IsBoolean, IsDate, IsNumber, IsString, IsArray} from "class-validator";

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

    @IsNumber()
    @Column()
    genderRefId: number;

    @IsNumber()
    @Column()
    statusRefId: number;

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
    organisations: Organisation[];
    affiliates: Organisation[];

    @IsArray({each: true})
    @OneToMany(type => UserRoleEntity, userRoleEntity => userRoleEntity.user)
    userRoleEntities: UserRoleEntity[];

    @IsNumber()
    @Column({ default: 0 })
    isDeleted: number;
    
    @IsBoolean()
    @Column()
    tfaEnabled: boolean;

    @IsString()
    @Column({select: false})
    tfaSecret: string;

    @IsString()
    @Column({select: false})
    tfaSecretUrl: string;
}
