import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RankUmpireRouteParams {
  @Type(() => Number)
  @Min(1)
  @Max(100000000)
  @IsInt()
  competitionId: number;

  @Type(() => Number)
  @Min(1)
  @Max(100000000)
  @IsInt()
  umpireId: number;
}
