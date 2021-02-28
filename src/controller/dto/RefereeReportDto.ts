import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class RefereeReportDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsNumber()
  userId: number;

  @IsNumber()
  matchId: number;

  @IsNumber()
  competitionId?: number;

  @IsDateString()
  incidentTime: Date;

  @IsNumber()
  foulUserId: number;

  @IsString()
  foulPlayerRole: string;

  @IsArray()
  offences: Record<string, any>[];

  @IsArray()
  clarifyingQuestions: Record<string, any>[];

  @IsArray()
  witnesses: Record<string, any>[];
}
