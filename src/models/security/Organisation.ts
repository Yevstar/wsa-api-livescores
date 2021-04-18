import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IsNumber, IsString } from 'class-validator';

@Entity({ database: 'wsa_users' })
export class Organisation extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  organisationUniqueKey: string;

  @IsNumber()
  @Column()
  organisationTypeRefId: number;

  @IsString()
  @Column({ default: null, nullable: true })
  name: string;

  // @IsString()
  // @Column({ default: null, nullable: true })
  // address: string;

  @IsString()
  @Column({ default: null, nullable: true })
  phoneNo: string;

  @IsString()
  @Column({ default: null, nullable: true })
  street1: string;

  @IsString()
  @Column({ default: null, nullable: true })
  street2: string;

  @IsString()
  @Column({ default: null, nullable: true })
  suburb: string;

  @IsString()
  @Column({ default: null, nullable: true })
  postalCode: string;

  @IsNumber()
  @Column({ default: null, nullable: true })
  whatIsTheLowestOrgThatCanAddChild: number;

  @IsString()
  @Column({ default: null, nullable: true })
  city: string;

  @IsNumber()
  @Column({ default: null, nullable: true })
  stateRefId: number;

  @IsNumber()
  @Column({ default: null, nullable: true })
  parentOrgId: number;

  @IsNumber()
  @Column()
  statusRefId: number;

  @IsNumber()
  @Column()
  createdBy: number;

  @IsNumber()
  @Column({ nullable: true, default: null })
  updatedBy: number;

  @IsNumber()
  @Column({ default: 0 })
  isDeleted: number;

  @IsString()
  @Column({ default: null, nullable: true })
  stripeAccountID: string;

  @IsString()
  @Column({ default: null, nullable: true })
  stripeCustomerAccountId: string;

  @IsString()
  @Column({ default: null, nullable: true })
  stripeBecsMandateId: string;

  @IsString()
  @Column({ default: null, nullable: true })
  posTerminalId: string;
}
