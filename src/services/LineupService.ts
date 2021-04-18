import { Service } from 'typedi';
import BaseService from './BaseService';
import { Lineup } from '../models/Lineup';
import { DeleteResult } from 'typeorm-plus';

@Service()
export default class LineupService extends BaseService<Lineup> {
  modelName(): string {
    return Lineup.name;
  }

  public async findByParams(
    matchId: number,
    competitionId: number,
    teamId: number,
    borrowed: boolean,
  ): Promise<Lineup[]> {
    let query = this.entityManager
      .createQueryBuilder(Lineup, 'l')
      .where('l.matchId = :matchId', { matchId });

    if (competitionId) query.andWhere('l.competitionId = :competitionId', { competitionId });
    if (teamId) query.andWhere('l.teamId = :teamId', { teamId });
    if (borrowed) query.andWhere('l.borrowed = :borrowed', { borrowed: borrowed ? 1 : 0 });

    return query.getMany();
  }
}
