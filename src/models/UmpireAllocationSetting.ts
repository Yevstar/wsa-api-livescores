import {
    Column,
    Entity, JoinColumn, ManyToOne,
} from "typeorm-plus";
import {IsBoolean, IsNumber} from "class-validator";
import {Competition} from "./Competition";
import {BaseUmpireAllocationSetting} from "./BaseUmpireAllocationSetting";
import {UmpireAllocatorTypeEnum} from "./enums/UmpireAllocatorTypeEnum";
import {UmpireAllocationTypeEnum} from "./enums/UmpireAllocationTypeEnum";

@Entity({ name: "UmpireAllocationSettings" })
export class UmpireAllocationSetting extends BaseUmpireAllocationSetting {

    @Column()
    @IsNumber()
    umpireAllocationTypeRefId: UmpireAllocationTypeEnum;

    @Column()
    @IsNumber()
    umpireAllocatorTypeRefId: UmpireAllocatorTypeEnum;

    @Column({default: false})
    @IsBoolean()
    activateReserves: boolean;

    @Column({default: false})
    @IsBoolean()
    activateCoaches: boolean;

    @ManyToOne(type => Competition, competition => competition.umpireAllocationSettings)
    @JoinColumn({
        name: "competitionId"
    })
    competition: Competition;
}
