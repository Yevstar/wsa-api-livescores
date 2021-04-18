import { Entity, JoinColumn, OneToOne } from 'typeorm-plus';
import { Competition } from './Competition';
import { BaseUmpireAllocationSetting } from './BaseUmpireAllocationSetting';

@Entity()
export class NoUmpiresUmpireAllocationSetting extends BaseUmpireAllocationSetting {
  @OneToOne(type => Competition)
  @JoinColumn({
    name: 'competitionId',
  })
  competition: Competition;
}
