import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm-plus";
import {IsDate, IsNumber, IsString} from "class-validator";

/// For referring the data model of another db we are giving the
/// name as below wsa_users.<name>.
/// https://github.com/typeorm/typeorm/issues/323 as Goodmain commented on 2 Mar 2017
@Entity('wsa_users.role')
export class Role extends BaseEntity {

    public static MANAGER = 3;
    public static SCORER = 4;
    public static MEMBER = 5;
    public static PLAYER = 8;
    public static UMPIRE = 15;
    public static COACH = 17;
    public static EVENT_INVITEE = 14;

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    description: string;

    @IsNumber()
    @Column({ default: 0 })
    applicableToWeb: number;

    @IsDate()
    @Column({name: 'createdOn'})
    createdAt: Date;

    @IsDate()
    @Column({name: 'updatedOn'})
    updatedAt: Date;
}
