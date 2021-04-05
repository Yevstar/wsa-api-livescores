import {IsNumber} from "class-validator";
import {Type} from "class-transformer";

export class RankedCountPathParams {
    @IsNumber()
    @Type(() => Number)
    competitionId: number;
}
