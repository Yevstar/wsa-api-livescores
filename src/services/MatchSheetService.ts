import {Service} from "typedi";
import BaseService from "./BaseService";
import {MatchSheet} from "../models/MatchSheet";

@Service()
export default class MatchSheetService extends BaseService<MatchSheet> {

  modelName(): string {
    return MatchSheet.name;
  }

  public async findByUserId(userId?: number): Promise<MatchSheet[]> {
    let query = this.entityManager.createQueryBuilder(MatchSheet, 'matchSheet');
    if (userId !== undefined && userId !== null) {
      const from = new Date();
      from.setDate(from.getDate() - 7);

      query = this.entityManager.createQueryBuilder(MatchSheet, 'matchSheet')
        .andWhere('matchSheet.userId = :userId', {userId})
        .andWhere("matchSheet.createdAt >= :from", { from });
    }

    return query.getMany()
  }

  public async findByCompetitionId(userId?: number, competitionId?: number): Promise<MatchSheet[]> {
    let query = this.entityManager.createQueryBuilder(MatchSheet, 'matchSheet');
    if (competitionId !== undefined && competitionId !== null) {
      query = this.entityManager.createQueryBuilder(MatchSheet, 'matchSheet')
        .andWhere('matchSheet.userId = :userId', {userId})
        .andWhere('matchSheet.competitionId = :competitionId', {competitionId})
        .orderBy('created_at', 'DESC');
    }

    return query.getMany()
  }
}
