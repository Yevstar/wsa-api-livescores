import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrganisationQueryParam {
  @Type(() => Number)
  @Min(1)
  @Max(100000000)
  @IsInt()
  organisationId: number;

  @Min(1)
  @Max(1000000)
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  umpireId?: number;
}
