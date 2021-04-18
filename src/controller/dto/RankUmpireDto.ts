import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { UpdateRankType } from '../../services/UmpireService';
import { Type } from 'class-transformer';

export class RankUmpireDto {
  @Type(() => Number)
  @Min(1)
  @Max(1000000)
  @IsInt()
  rank: number;

  @IsOptional()
  @IsIn(['shift', 'replace'])
  updateRankType: UpdateRankType;
}
