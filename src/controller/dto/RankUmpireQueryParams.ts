import {
  IsInt,
  Max,
  Min,
} from "class-validator";
import {Type} from "class-transformer";

export class RankUmpireQueryParams {
  @Type(() => Number)
  @Min(1)
  @Max(100000000)
  @IsInt()
  organisationId: number;
}
