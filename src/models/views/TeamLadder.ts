import {ViewColumn, ViewEntity} from "typeorm-plus";
import {IsNumber, IsString} from "class-validator";

@ViewEntity()
export class TeamLadder {

    @IsString()
    @ViewColumn()
    logoUrl: string;

    @IsString()
    @ViewColumn()
    name: string;

    @IsNumber()
    @ViewColumn()
    id: number;

    @IsNumber()
    @ViewColumn()
    divisionId: number;

    @IsNumber()
    @ViewColumn()
    competitionId: number;

    @IsNumber()
    @ViewColumn()
    P: number;

    @IsNumber()
    @ViewColumn()
    W: number;

    @IsNumber()
    @ViewColumn()
    L: number;

    @IsNumber()
    @ViewColumn()
    D: number;

    @IsNumber()
    @ViewColumn()
    F: number;

    @IsNumber()
    @ViewColumn()
    A: number;

    @IsNumber()
    @ViewColumn()
    PTS: number;

    @IsNumber()
    @ViewColumn()
    SMR: number;

    @IsNumber()
    @ViewColumn()
    FW: number;

    @IsNumber()
    @ViewColumn()
    FL: number;
}
