import { ViewColumn, ViewEntity } from 'typeorm-plus';
import { IsNumber, IsString, IsDate } from 'class-validator';

@ViewEntity()
export class TeamPlayerActivity {
  @IsNumber()
  @ViewColumn()
  matchId: number;

  @IsNumber()
  @ViewColumn()
  teamId: number;

  @IsNumber()
  @ViewColumn()
  playerId: number;

  @IsNumber()
  @ViewColumn()
  mnbMatchId: number;

  @IsDate()
  @ViewColumn()
  startTime: Date;

  @IsNumber()
  @ViewColumn()
  divisionId: number;

  @IsString()
  @ViewColumn()
  divisionName: String;

  @IsString()
  @ViewColumn()
  teamName: String;

  @IsString()
  @ViewColumn()
  name: String;

  @IsNumber()
  @ViewColumn()
  mnbPlayerId: number;

  @IsString()
  @ViewColumn()
  firstName: String;

  @IsString()
  @ViewColumn()
  lastName: String;

  @IsNumber()
  @ViewColumn()
  period: number;

  @IsDate()
  @ViewColumn()
  activityTimestamp: Date;

  @IsString()
  @ViewColumn()
  status: String;

  @IsNumber()
  @ViewColumn()
  sortOrder: number;

  @IsNumber()
  @ViewColumn()
  competitionId: number;

  @IsNumber()
  @ViewColumn()
  positionId: number;

  @IsString()
  @ViewColumn()
  positionName: String;
}
