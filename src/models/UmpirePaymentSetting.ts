import {
    BaseEntity,
    Column,
    Entity,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn
} from "typeorm-plus";
import {IsBoolean, IsNumber} from "class-validator";
import {Competition} from "./Competition";
import {Division} from "./Division";
import {UmpirePaymentFeeTypeEnum} from "./enums/UmpirePaymentFeeTypeEnum";
import {ByBadgeUmpirePaymentFee} from "./ByBadgeUmpirePaymentFee";
import {ByPoolUmpirePaymentFee} from "./ByPoolUmpirePaymentFee";
import {CompetitionOrganisationRoleEnum} from "./enums/CompetitionOrganisationRoleEnum";

@Entity()
export class UmpirePaymentSetting extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsNumber()
    competitionId: number;

    @ManyToOne(type => Competition, competition => competition.umpirePaymentSettings)
    competition: Competition;

    @Column()
    @IsBoolean()
    allDivisions: boolean;

    @ManyToMany(type => Division, division => division.umpirePaymentSettings, {
        eager: true
    })
    divisions: Division[];

    @Column()
    UmpirePaymentFeeType: UmpirePaymentFeeTypeEnum;

    @OneToMany(type => ByBadgeUmpirePaymentFee, fee => fee.umpirePaymentSetting, {
        eager: true
    })
    @JoinColumn()
    byBadge: ByBadgeUmpirePaymentFee[];

    @OneToMany(type => ByPoolUmpirePaymentFee, fee => fee.umpirePaymentSetting, {
        eager: true
    })
    @JoinColumn()
    byPool: ByPoolUmpirePaymentFee[];

    @Column({
        enum: CompetitionOrganisationRoleEnum
    })
    savedBy: CompetitionOrganisationRoleEnum;

    @Column()
    @IsNumber()
    organisationId: number;
}
