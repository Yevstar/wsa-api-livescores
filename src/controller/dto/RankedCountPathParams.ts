import { IsInt, IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RankedCountPathParams {
  @Type(() => Number)
  @Min(1)
  @Max(1000000)
  @IsInt()
  competitionId: number;
}
