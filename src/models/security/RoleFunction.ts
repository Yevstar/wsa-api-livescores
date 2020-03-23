import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from "typeorm-plus";
import {Role} from "./Role";
import {Function} from "./Function";
import {IsNumber} from "class-validator";

/// For referring the data model of another db we are giving the
/// name as below wsa_users.<name>.
/// https://github.com/typeorm/typeorm/issues/323 as Goodmain commented on 2 Mar 2017
@Entity('wsa_users.functionRole')
export class RoleFunction extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(type => Role)
    @JoinColumn()
    role: Role;

    @IsNumber()
    @Column()
    roleId: number;

    @OneToOne(type => Function)
    @JoinColumn()
    function: Function;

    @IsNumber()
    @Column()
    functionId: number;

}
