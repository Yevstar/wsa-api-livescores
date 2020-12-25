import {Team} from './Team';
import {
    BaseEntity,
    Column,
    Entity,
    JoinColumn, JoinTable,
    ManyToMany,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn
} from 'typeorm-plus';
import {Competition} from "./Competition";
import {IsNumber, IsString, IsBoolean, ValidateNested} from "class-validator";
import {UmpireAllocationSetting} from "./UmpireAllocationSetting";
import {UmpirePool} from "./UmpirePool";
import {UmpirePaymentSetting} from "./UmpirePaymentSetting";
import {UmpirePaymentAllowedDivisionsSetting} from "./UmpirePaymentAllowedDivisionsSetting";

@Entity()
export class Division extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    divisionName: string;

    @IsNumber()
    @Column()
    age: number;

    @IsString()
    @Column()
    grade: string;

    @IsBoolean()
    @Column()
    positionTracking: boolean;

    @IsBoolean()
    @Column()
    recordGoalAttempts: boolean;

    @IsNumber()
    @Column()
    competitionId: number;

    @ValidateNested()
    @OneToOne(type => Competition)
    @JoinColumn()
    competition: Competition;

    @OneToMany(type => Team, team => team.division)
    teams: Promise<Team[]>;

    @ManyToMany(type => UmpireAllocationSetting, umpireAllocationSetting => umpireAllocationSetting.divisions)
    umpireAllocationSettings: UmpireAllocationSetting[];

    @ManyToMany(type => UmpirePool, umpirePool => umpirePool.divisions)
    umpirePools: UmpirePool[];

    @ManyToMany(type => UmpirePaymentSetting, umpirePaymentSetting => umpirePaymentSetting.divisions)
    @JoinTable()
    umpirePaymentSettings: UmpirePaymentSetting[];

    @ManyToMany(type => UmpirePaymentAllowedDivisionsSetting, setting => setting.divisions)
    @JoinTable()
    umpirePaymentAllowedDivisionsSettings: UmpirePaymentAllowedDivisionsSetting[];
}
