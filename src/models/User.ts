import {IsBoolean, IsDate, IsNumber, IsString, IsArray} from "class-validator";
import {BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany, ManyToMany} from "typeorm-plus";

import {Team} from './Team';
import {LinkedCompetitionOrganisation} from './LinkedCompetitionOrganisation';
import {UserRoleEntity} from './security/UserRoleEntity';
import {UmpirePool} from "./UmpirePool";
import {LinkedEntities} from "./views/LinkedEntities";
import {Expose} from "class-transformer";
import {UmpireCompetitionRank} from "./UmpireCompetitionRank";

/// For referring the data model of another db we are giving the
/// name as below wsa_users.<name>.
/// https://github.com/typeorm/typeorm/issues/323 as Goodmain commented on 2 Mar 2017
@Entity({
    database: 'wsa_users'
})
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
    @Column({ select: false })
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
    @Column({ select: false })
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
    competitionOrganisations: LinkedCompetitionOrganisation[];
    affiliates: LinkedCompetitionOrganisation[];

    @IsArray({ each: true })
    @OneToMany(type => UserRoleEntity, userRoleEntity => userRoleEntity.user)
    userRoleEntities: UserRoleEntity[];

    @IsNumber()
    @Column({ default: 0 })
    isDeleted: number;

    @IsBoolean()
    @Column()
    tfaEnabled: boolean;

    @IsString()
    @Column({ select: false })
    tfaSecret: string;

    @IsString()
    @Column({ select: false })
    tfaSecretUrl: string;

    @IsDate()
    @Column({ nullable: true, default: null })
    lastAppLogin: Date;

    @IsString()
    @Column()
    stripeCustomerAccountId: string;

    @IsString()
    @Column()
    stripeAccountId: string;

    @ManyToMany(type => UmpirePool, umpirePool => umpirePool)
    umpirePools: UmpirePool[];

    @OneToMany(type => UmpireCompetitionRank, umpireCompetitionRank => umpireCompetitionRank.umpire)
    umpireCompetitionRank: UmpireCompetitionRank[];
}
