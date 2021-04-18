import { Service } from 'typedi';
import BaseService from './BaseService';
import { MatchScores } from '../models/MatchScores';
import { DeleteResult } from 'typeorm-plus';

@Service()
export default class MatchScoresService extends BaseService<MatchScores> {
  modelName(): string {
    return MatchScores.name;
  }

  public async findByMatchIdAndPeriod(matchId: number, period: number): Promise<MatchScores> {
    let query = this.entityManager.createQueryBuilder(MatchScores, 'scores');
    query.andWhere('scores.matchId = :matchId', { matchId });
    if (period) {
      query.andWhere('scores.period = :period', { period });
    } else {
      query.andWhere('scores.period is null');
    }

    return query.getOne();
  }

  public async findByMatchId(matchId: number): Promise<MatchScores[]> {
    return this.entityManager
      .createQueryBuilder(MatchScores, 'scores')
      .where('scores.matchId = :matchId', { matchId })
      .getMany();
  }

  public async deleteByMatchId(matchId: number): Promise<DeleteResult> {
    return this.entityManager
      .createQueryBuilder()
      .delete()
      .from(MatchScores)
      .andWhere('matchId = :matchId', { matchId })
      .execute();
  }
}
