import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne } from 'typeorm-plus';
import { IsBoolean, IsNumber } from 'class-validator';
import { Competition } from './Competition';
import { BaseUmpireAllocationSetting } from './BaseUmpireAllocationSetting';
import { UmpireAllocatorTypeEnum } from './enums/UmpireAllocatorTypeEnum';
import { UmpireAllocationTypeEnum } from './enums/UmpireAllocationTypeEnum';

@Entity()
export class UmpireAllocationSetting extends BaseUmpireAllocationSetting {
  @Column()
  @IsNumber()
  umpireAllocationTypeRefId: UmpireAllocationTypeEnum;

  @Column()
  @IsNumber()
  umpireAllocatorTypeRefId: UmpireAllocatorTypeEnum;

  @Column({ default: false })
  @IsBoolean()
  activateReserves: boolean;

  @Column({ default: false })
  @IsBoolean()
  activateCoaches: boolean;

  @Column({ nullable: true })
  timeBetweenMatches: number;

  @Column({ nullable: true })
  maxNumberOfMatches: number;

  @ManyToOne(type => Competition, competition => competition.umpireAllocationSettings)
  @JoinColumn({
    name: 'competitionId',
  })
  competition: Competition;

  @BeforeInsert()
  @BeforeUpdate()
  checkAllocationType() {
    if (
      this.umpireAllocationTypeRefId != UmpireAllocationTypeEnum.VIA_POOLS &&
      this.umpireAllocationTypeRefId != UmpireAllocationTypeEnum.OWN_ORGANISATION
    ) {
      this.timeBetweenMatches = null;
      this.maxNumberOfMatches = null;
    }
  }
}
