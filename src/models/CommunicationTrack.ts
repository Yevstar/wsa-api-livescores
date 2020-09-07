import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { IsNumber, IsString, IsDate } from "class-validator";

@Entity('communicationTrack', { database: process.env.MYSQL_DATABASE_COMMON })
export class CommunicationTrack extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    emailId: string;

    @IsString()
    @Column()
    content: string;

    @IsString()
    @Column()
    subject: string;

    @IsString()
    @Column()
    contactNumber: string;
    
    @IsNumber()
    @Column()
    userId: number;

    @IsNumber()
    @Column()
    entityId: number;

    @IsNumber()
    @Column()
    communicationType: number;

    @IsNumber()
    @Column()
    statusRefId: number;
    
    @IsNumber()
    @Column()
    deliveryChannelRefId: number;

    @IsNumber()
    @Column()
    createdBy: number;

    // @IsNumber()
    // @Column()
    // updatedBy: number;

    // @IsNumber()
    // @Column()
    // isDeleted: number;

    // @IsDate()
    // @Column({ nullable: true, default: null })
    // updatedOn: Date;

    // @IsDate()
    // @Column({ type: 'datetime', default: () => new Date() })
    // createdOn: Date;

}
