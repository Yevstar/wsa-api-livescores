import { Service } from 'typedi';
import BaseService from './BaseService';
import { CompetitionInvitees } from '../models/CompetitionInvitees';

@Service()
export default class CompetitionInviteesService extends BaseService<CompetitionInvitees> {
  modelName(): string {
    return CompetitionInvitees.name;
  }

  public async getInviteesByCompetition(competitionId: number): Promise<any> {
    let query = this.entityManager.createQueryBuilder(CompetitionInvitees, 'compInv');
    query.andWhere('compInv.competitionId = :competitionId', { competitionId });
    return query.getMany();
  }

  public async deleteInviteesByCompetitionId(competitionId: number): Promise<any> {
    return await this.entityManager
      .createQueryBuilder()
      .delete()
      .from(CompetitionInvitees)
      .andWhere('competitionId = :competitionId', { competitionId })
      .execute();
  }
}
