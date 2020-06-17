import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm-plus";
import {IsNumber, IsString, IsDate, IsBoolean} from "class-validator";

@Entity('wsa_common.venue')
export class Venue extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    shortName: string;

    @IsString()
    @Column()
    street1: string;

    @IsString()
    @Column()
    street2: string;

    @IsString()
    @Column()
    suburb: string;

    @IsNumber()
    @Column()
    stateRefId: number;

    @IsString()
    @Column()
    postalCode: string;

    @IsString()
    @Column()
    contactNumber: string;

    @IsNumber()
    @Column()
    statusRefId: number;

    @IsNumber()
    @Column()
    createdBy: number;

    @IsNumber()
    @Column()
    createdByOrganisation: number;

    @IsNumber()
    @Column({ nullable: true, default: null })
    updatedBy: number;

    @IsDate()
    @Column({ nullable: true, default: null })
    updatedOn: Date;

    @IsNumber()
    @Column({ default: 0 })
    isDeleted: number;

    @IsString()
    @Column()
    lat: string;

    @IsString()
    @Column()
    lng: string;

    @IsBoolean()
    @Column()
    isEventSpecific: boolean;
}
