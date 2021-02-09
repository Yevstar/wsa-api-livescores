import { IsNumber, IsOptional, IsString } from "class-validator";

export class SuspensionDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  suspendedFrom?: Date;

  @IsString()
  @IsOptional()
  suspendedTo?: Date;

  @IsNumber()
  @IsOptional()
  playerId?: number;

  @IsNumber()
  @IsOptional()
  incidentId?: number;

  @IsNumber()
  @IsOptional()
  suspensionTypeRefId?: number;
}
