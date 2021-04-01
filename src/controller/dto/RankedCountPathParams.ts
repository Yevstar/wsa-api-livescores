import {IsNumber} from "class-validator";

export class RankedCountPathParams {
    @IsNumber()
    competitionId: number;
}
