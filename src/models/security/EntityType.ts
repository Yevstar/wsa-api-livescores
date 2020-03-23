import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm-plus";
import {IsDate, IsNumber, IsString} from "class-validator";

/// For referring the data model of another db we are giving the
/// name as below wsa_users.<name>.
/// https://github.com/typeorm/typeorm/issues/323 as Goodmain commented on 2 Mar 2017
@Entity('wsa_users.entityType')
export class EntityType extends BaseEntity {

    public static COMPETITION = 1;
    public static CLUB = 2;
    public static TEAM = 3;
    public static USER = 4;
    public static PLAYER = 5;

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsDate()
    @Column({name: 'createdOn'})
    createdAt: Date;

    @IsDate()
    @Column({name: 'updatedOn'})
    updatedAt: Date;
}
