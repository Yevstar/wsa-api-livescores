import { IsDate, IsNumber, IsString } from "class-validator";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nonPlayer',{ database: process.env.MYSQL_DATABASE_COMP })
export class NonPlayer extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    userRegistrationId: number;
    
    @IsNumber()
    @Column()
    competitionId: Number;  

    @IsNumber()
    @Column()
    organisationId: Number;  


    // @IsString()
    // @Column()
    // childrenCheckNumber: string;

    @IsString()
    @Column()
    payingFor: number;

    @IsNumber()
    @Column()
    statusRefId: number;

    @IsNumber()
    @Column()
    competitionMembershipProductTypeId: number;

    @IsNumber()
    @Column()
    userId: number;

    @IsNumber()
    @Column()
    createdBy: number;

    @IsNumber()
    @Column({ nullable: true, default: null })
    updatedBy: number;

    @IsDate()
    @Column({ nullable: true, default: null })
    updatedOn: Date;
    
    @IsNumber()
    @Column({ default: 0 })
    isDeleted: number;

}
