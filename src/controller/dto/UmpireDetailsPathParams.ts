import {
    IsInt,
    Max,
    Min,
} from "class-validator";
import {Type} from "class-transformer";

export class UmpireDetailsPathParams {
    @Min(1)
    @Max(1000000)
    @IsInt()
    @Type(() => Number)
    competitionId: number;

    @Min(1)
    @Max(1000000)
    @IsInt()
    @Type(() => Number)
    umpireId: number;
}
