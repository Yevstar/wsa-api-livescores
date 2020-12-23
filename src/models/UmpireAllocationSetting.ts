import {
    Column,
    Entity, JoinColumn, ManyToOne,
} from "typeorm-plus";
import {IsBoolean, IsNumber} from "class-validator";
import {Competition} from "./Competition";
import {BaseUmpireAllocationSetting} from "./BaseUmpireAllocationSetting";

@Entity({ synchronize: true, name: "UmpireAllocationSettings" })
export class UmpireAllocationSetting extends BaseUmpireAllocationSetting {

    @Column()
    @IsNumber()
    umpireAllocationTypeRefId: number;

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
