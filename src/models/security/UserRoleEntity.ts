import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from "typeorm-plus";
import {EntityType} from "./EntityType";
import {User} from "../User";
import {Role} from "./Role";
import {IsNumber} from "class-validator";

/// For referring the data model of another db we are giving the
/// name as below wsa_users.<name>.
/// https://github.com/typeorm/typeorm/issues/323 as Goodmain commented on 2 Mar 2017
@Entity('wsa_users.userRoleEntity')
export class UserRoleEntity extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(type => Role)
    @JoinColumn()
    role: Role;

    @IsNumber()
    @Column()
    roleId: number;

    @IsNumber()
    @Column()
    entityId: number;

    @OneToOne(type => EntityType)
    @JoinColumn()
    entityType: EntityType;

    @IsNumber()
    @Column()
    entityTypeId: number;

    @OneToOne(type => User)
    @JoinColumn()
    user: User;

    @IsNumber()
    @Column()
    userId: number;

    //TODO forgoted column
    //@Column()
    //status: number;

    @Column({name: 'createdOn'})
    createdAt: Date;

    @IsNumber()
    @Column()
    createdBy: number;

    @IsNumber()
    @Column({ nullable: true, default: null })
    updatedBy: number;

    @Column({name: 'updatedOn'})
    updatedAt: Date;

    @IsNumber()
    @Column({ default: 0 })
    isDeleted: number;
}
