import { Service } from 'typedi';
import BaseService from './BaseService';
import { LadderFormat } from '../models/LadderFormat';

@Service()
export default class LadderFormatService extends BaseService<LadderFormat> {
  modelName(): string {
    return LadderFormat.name;
  }

  public async findByCompetitionId(competitionId: number): Promise<LadderFormat[]> {
    let query = this.entityManager.createQueryBuilder(LadderFormat, 'ladderFormat');
    query.where('ladderFormat.competitionId = :competitionId and deleted_at is null', {
      competitionId,
    });
    return await query.getMany();
  }
}
