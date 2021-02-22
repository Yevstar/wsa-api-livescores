import {
    IsInt,
    Max,
    Min,
} from "class-validator";
import {Type} from "class-transformer";

export class UmpireAllocationBodyParams {
    @Min(1, {each: true})
    @Max(1000000, {each: true})
    @IsInt({each: true})
    @Type(() => Number)
    rounds: number[];
}
