import { Service } from 'typedi';
import BaseService from './BaseService';
import { LadderFormatDivision } from '../models/LadderFormatDivision';

@Service()
export default class LadderFormatDivisionService extends BaseService<LadderFormatDivision> {
  modelName(): string {
    return LadderFormatDivision.name;
  }

  public async findByLadderFormatId(ladderFormatId: number): Promise<LadderFormatDivision[]> {
    let query = this.entityManager.createQueryBuilder(LadderFormatDivision, 'ladderFormDiv');
    query.where('ladderFormDiv.ladderFormatId = :ladderFormatId and deleted_at is null', {
      ladderFormatId,
    });
    return await query.getMany();
  }
}
