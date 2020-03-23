import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from "typeorm-plus";
import {IsNumber, IsString, IsDate, ValidateNested} from "class-validator";
import {Venue} from './Venue';

@Entity('wsa_common.venueCourt')
export class VenueCourt extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: String;

    @IsNumber()
    @Column()
    venueId: number;

    @IsNumber()
    @Column()
    courtNumber: number;

    @IsString()
    @Column()
    lat: string;

    @IsString()
    @Column()
    lng: string;

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

    @ValidateNested()
    @OneToOne(type => Venue)
    @JoinColumn()
    venue: Venue;
}
