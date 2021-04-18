import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UmpirePaymentFeeRate } from './UmpirePaymentFeeRate';
import { UmpirePaymentSetting } from './UmpirePaymentSetting';

export abstract class UmpirePaymentFee extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  umpirePaymentSettingId!: number;

  // @ManyToOne(type => UmpirePaymentSetting)
  // @JoinColumn()
  // umpirePaymentSetting: UmpirePaymentSetting;
}
